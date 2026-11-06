import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminPin } from "@/lib/pin";

export async function POST(req: Request) {
  try {
    const { action, outletId, pin } = await req.json();

    const ADMIN_PIN = getAdminPin();
    if (pin !== ADMIN_PIN) {
      return NextResponse.json({ error: "Otorisasi Gagal: PIN Admin tidak valid." }, { status: 401 });
    }

    if (action === "reset_pos") {
      // 1. Reset POS: Menghapus data transaksi, pengeluaran kasir, dan shift closing (bisa per outlet atau semua)
      const outletFilter = outletId && outletId !== "all" ? { outlet_id: outletId } : {};

      const deletedItems = await prisma.transactionItem.deleteMany({
        where: outletId && outletId !== "all" ? { transaction: { outlet_id: outletId } } : {},
      });

      const deletedTx = await prisma.transaction.deleteMany({
        where: outletFilter,
      });

      const deletedExpenses = await prisma.expense.deleteMany({
        where: outletFilter,
      });

      const deletedClosing = await prisma.shiftClosing.deleteMany({
        where: outletFilter,
      });

      return NextResponse.json({
        success: true,
        message: `Reset POS Terminal Berhasil: ${deletedTx.count} transaksi, ${deletedExpenses.count} pengeluaran, dan ${deletedClosing.count} shift closing telah dibersihkan.`,
        details: {
          transactionsCleared: deletedTx.count,
          itemsCleared: deletedItems.count,
          expensesCleared: deletedExpenses.count,
          closingsCleared: deletedClosing.count,
        },
      });
    } else if (action === "reset_expenses") {
      // Reset Khusus Pengeluaran Kasir / Operasional
      const outletFilter = outletId && outletId !== "all" ? { outlet_id: outletId } : {};
      const deleted = await prisma.expense.deleteMany({ where: outletFilter });
      return NextResponse.json({
        success: true,
        message: `${deleted.count} catatan pengeluaran berhasil dihapus.`,
      });
    } else if (action === "reset_database") {
      // 2. Reset Database Lengkap (Hanya untuk Testing): Membersihkan dan men-seed ulang semua data awal
      await prisma.expense.deleteMany();
      await prisma.outletProduct.deleteMany();
      await prisma.bOM_Recipe.deleteMany();
      await prisma.transactionItem.deleteMany();
      await prisma.transaction.deleteMany();
      await prisma.shiftClosing.deleteMany();
      await prisma.boothStock.deleteMany();
      await prisma.product.deleteMany();
      await prisma.rawMaterial.deleteMany();
      await prisma.outlet.deleteMany();

      // Buat Outlets
      const outlet1 = await prisma.outlet.create({
        data: {
          code: "OUT-01",
          name: "Kedai #1 - Indomaret Sudirman",
          address: "Jl. Jend. Sudirman No. 45 (Teras Indomaret)",
          active_status: true,
        },
      });

      const outlet2 = await prisma.outlet.create({
        data: {
          code: "OUT-02",
          name: "Kedai #2 - Alfamart Diponegoro",
          address: "Jl. Diponegoro No. 88 (Teras Alfamart)",
          active_status: true,
        },
      });

      // Raw Materials
      const cupReg = await prisma.rawMaterial.create({ data: { name: "Cup Reguler", unit: "pcs" } });
      const cupJumbo = await prisma.rawMaterial.create({ data: { name: "Cup Jumbo", unit: "pcs" } });
      const liquidPremix = await prisma.rawMaterial.create({ data: { name: "Liquid Tea Premix", unit: "ml" } });

      const rawVanilla = await prisma.rawMaterial.create({ data: { name: "Vanilla Syrup", unit: "ml" } });
      const rawThai = await prisma.rawMaterial.create({ data: { name: "Thai Tea Mix", unit: "gram" } });
      const rawMilkTea = await prisma.rawMaterial.create({ data: { name: "Milk Tea Mix", unit: "gram" } });
      const rawChoco = await prisma.rawMaterial.create({ data: { name: "Chocolate Powder", unit: "gram" } });
      const rawLychee = await prisma.rawMaterial.create({ data: { name: "Lychee Syrup", unit: "ml" } });
      const rawCappuccino = await prisma.rawMaterial.create({ data: { name: "Cappuccino Mix", unit: "gram" } });
      const rawGuava = await prisma.rawMaterial.create({ data: { name: "Guava Syrup", unit: "ml" } });
      const rawMango = await prisma.rawMaterial.create({ data: { name: "Mango Syrup", unit: "ml" } });
      const rawBlackcurrant = await prisma.rawMaterial.create({ data: { name: "Blackcurrant Syrup", unit: "ml" } });
      const rawApple = await prisma.rawMaterial.create({ data: { name: "Apple Syrup", unit: "ml" } });
      const rawOrange = await prisma.rawMaterial.create({ data: { name: "Orange Syrup", unit: "ml" } });
      const rawLemonHoney = await prisma.rawMaterial.create({ data: { name: "Lemon Honey Syrup", unit: "ml" } });
      const rawCreamyTopping = await prisma.rawMaterial.create({ data: { name: "Extra Creamy Foam", unit: "ml" } });

      const allRawMaterials = [
        { mat: cupReg, stockOut1: 300, stockOut2: 250 },
        { mat: cupJumbo, stockOut1: 250, stockOut2: 200 },
        { mat: liquidPremix, stockOut1: 45000, stockOut2: 40000 },
        { mat: rawVanilla, stockOut1: 5000, stockOut2: 5000 },
        { mat: rawThai, stockOut1: 4000, stockOut2: 4000 },
        { mat: rawMilkTea, stockOut1: 4000, stockOut2: 4000 },
        { mat: rawChoco, stockOut1: 4000, stockOut2: 4000 },
        { mat: rawLychee, stockOut1: 5000, stockOut2: 5000 },
        { mat: rawCappuccino, stockOut1: 4000, stockOut2: 4000 },
        { mat: rawGuava, stockOut1: 5000, stockOut2: 5000 },
        { mat: rawMango, stockOut1: 5000, stockOut2: 5000 },
        { mat: rawBlackcurrant, stockOut1: 5000, stockOut2: 5000 },
        { mat: rawApple, stockOut1: 5000, stockOut2: 5000 },
        { mat: rawOrange, stockOut1: 5000, stockOut2: 5000 },
        { mat: rawLemonHoney, stockOut1: 5000, stockOut2: 5000 },
        { mat: rawCreamyTopping, stockOut1: 6000, stockOut2: 6000 },
      ];

      for (const item of allRawMaterials) {
        await prisma.boothStock.create({
          data: {
            outlet_id: outlet1.id,
            raw_material_id: item.mat.id,
            current_stock: item.stockOut1,
          },
        });

        await prisma.boothStock.create({
          data: {
            outlet_id: outlet2.id,
            raw_material_id: item.mat.id,
            current_stock: item.stockOut2,
          },
        });
      }

      // Daftar 13 Menu
      const menuList = [
        { name: "Jasmine Poci Iced Tea", category: "original", priceReg: 5000, priceJumbo: 7000 },
        { name: "Vanilla Poci Iced Tea", category: "original", priceReg: 6000, priceJumbo: 8000, flavorMaterialId: rawVanilla.id, flavorQtyReg: 20, flavorQtyJumbo: 30 },
        { name: "Thai Iced Tea", category: "milky", priceReg: 8000, priceJumbo: 10000, flavorMaterialId: rawThai.id, flavorQtyReg: 25, flavorQtyJumbo: 35 },
        { name: "Milk Iced Tea", category: "milky", priceReg: 8000, priceJumbo: 10000, flavorMaterialId: rawMilkTea.id, flavorQtyReg: 25, flavorQtyJumbo: 35 },
        { name: "Chocolate Iced Tea", category: "milky", priceReg: 8000, priceJumbo: 10000, flavorMaterialId: rawChoco.id, flavorQtyReg: 25, flavorQtyJumbo: 35 },
        { name: "Lychee Iced Tea", category: "fruity", priceReg: 7000, priceJumbo: 9000, flavorMaterialId: rawLychee.id, flavorQtyReg: 25, flavorQtyJumbo: 35 },
        { name: "Cappuccino Iced Tea", category: "milky", priceReg: 8000, priceJumbo: 10000, flavorMaterialId: rawCappuccino.id, flavorQtyReg: 25, flavorQtyJumbo: 35 },
        { name: "Guava Iced Tea", category: "fruity", priceReg: 7000, priceJumbo: 9000, flavorMaterialId: rawGuava.id, flavorQtyReg: 25, flavorQtyJumbo: 35 },
        { name: "Mango Iced Tea", category: "fruity", priceReg: 7000, priceJumbo: 9000, flavorMaterialId: rawMango.id, flavorQtyReg: 25, flavorQtyJumbo: 35 },
        { name: "Blackcurrant Iced Tea", category: "fruity", priceReg: 7000, priceJumbo: 9000, flavorMaterialId: rawBlackcurrant.id, flavorQtyReg: 25, flavorQtyJumbo: 35 },
        { name: "Apple Iced Tea", category: "fruity", priceReg: 7000, priceJumbo: 9000, flavorMaterialId: rawApple.id, flavorQtyReg: 25, flavorQtyJumbo: 35 },
        { name: "Orange Iced Tea", category: "fruity", priceReg: 7000, priceJumbo: 9000, flavorMaterialId: rawOrange.id, flavorQtyReg: 25, flavorQtyJumbo: 35 },
        { name: "Lemon Honey Iced Tea", category: "fruity", priceReg: 8000, priceJumbo: 10000, flavorMaterialId: rawLemonHoney.id, flavorQtyReg: 25, flavorQtyJumbo: 35 },
      ];

      for (const item of menuList) {
        const prodReg = await prisma.product.create({
          data: { name: `${item.name} (Reguler)`, price: item.priceReg, active_status: true },
        });
        const bomRegData = [
          { product_id: prodReg.id, raw_material_id: cupReg.id, quantity: 1 },
          { product_id: prodReg.id, raw_material_id: liquidPremix.id, quantity: 300 },
        ];
        if (item.flavorMaterialId && item.flavorQtyReg) {
          bomRegData.push({ product_id: prodReg.id, raw_material_id: item.flavorMaterialId, quantity: item.flavorQtyReg });
        }
        await prisma.bOM_Recipe.createMany({ data: bomRegData });

        const prodJumbo = await prisma.product.create({
          data: { name: `${item.name} (Jumbo)`, price: item.priceJumbo, active_status: true },
        });
        const bomJumboData = [
          { product_id: prodJumbo.id, raw_material_id: cupJumbo.id, quantity: 1 },
          { product_id: prodJumbo.id, raw_material_id: liquidPremix.id, quantity: 450 },
        ];
        if (item.flavorMaterialId && item.flavorQtyJumbo) {
          bomJumboData.push({ product_id: prodJumbo.id, raw_material_id: item.flavorMaterialId, quantity: item.flavorQtyJumbo });
        }
        await prisma.bOM_Recipe.createMany({ data: bomJumboData });
      }

      const topping = await prisma.product.create({
        data: { name: "Extra Creamy Topping", price: 3000, active_status: true },
      });
      await prisma.bOM_Recipe.create({
        data: { product_id: topping.id, raw_material_id: rawCreamyTopping.id, quantity: 50 },
      });

      return NextResponse.json({
        success: true,
        message: "Database berhasil di-reset total ke pengaturan pabrik (Seed default: 2 Kedai, 26 Menu, Stok Awal Segar).",
      });
    }

    return NextResponse.json({ error: "Aksi reset tidak valid." }, { status: 400 });
  } catch (error) {
    console.error("Reset API error:", error);
    return NextResponse.json(
      { error: "Gagal memproses reset database/POS." },
      { status: 500 }
    );
  }
}

