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
      const kantongTeh = await prisma.rawMaterial.create({ data: { name: "Kantong Teh", unit: "pcs" } });
      const rawCreamyTopping = await prisma.rawMaterial.create({ data: { name: "Sachet Extra Creamy", unit: "sachet" } });

      // 15 Varian Sachet Resmi Vendor Teh Poci
      const rawThai = await prisma.rawMaterial.create({ data: { name: "Poci Mix Thai Tea 12g", unit: "sachet" } });
      const rawCappuccino = await prisma.rawMaterial.create({ data: { name: "Poci Mix Cappuccino 10g", unit: "sachet" } });
      const rawLemonHoney = await prisma.rawMaterial.create({ data: { name: "Poci Mix Lemon Honey 3g", unit: "sachet" } });
      const rawLychee = await prisma.rawMaterial.create({ data: { name: "Poci Mix Lychee 3g", unit: "sachet" } });
      const rawChoco = await prisma.rawMaterial.create({ data: { name: "Poci Mix Chocolate", unit: "sachet" } });
      const rawApple = await prisma.rawMaterial.create({ data: { name: "Poci Mix Apple 3g", unit: "sachet" } });
      const rawOrange = await prisma.rawMaterial.create({ data: { name: "Poci Mix Orange 3g", unit: "sachet" } });
      const rawBlackcurrant = await prisma.rawMaterial.create({ data: { name: "Poci Mix Blackcurrant 3g", unit: "sachet" } });
      const rawMango = await prisma.rawMaterial.create({ data: { name: "Poci Mix Mango 3g", unit: "sachet" } });
      const rawMilkTea = await prisma.rawMaterial.create({ data: { name: "Poci Mix Milk Tea 15g", unit: "sachet" } });
      const rawMatcha = await prisma.rawMaterial.create({ data: { name: "Poci Mix Matcha 12g", unit: "sachet" } });
      const rawArenLatte = await prisma.rawMaterial.create({ data: { name: "Poci Mix Aren Latte 25g", unit: "sachet" } });
      const rawCoconutLatte = await prisma.rawMaterial.create({ data: { name: "Poci Mix Coconut Latte 25g", unit: "sachet" } });
      const rawTehTarik = await prisma.rawMaterial.create({ data: { name: "Poci Teh Tarik Gula Aren", unit: "sachet" } });
      const rawTehKrampul = await prisma.rawMaterial.create({ data: { name: "Poci Teh Krampul Selasih", unit: "sachet" } });

      const allRawMaterials = [
        { mat: cupReg, stockOut1: 300, stockOut2: 250 },
        { mat: cupJumbo, stockOut1: 250, stockOut2: 200 },
        { mat: kantongTeh, stockOut1: 50, stockOut2: 40 },
        { mat: rawCreamyTopping, stockOut1: 50, stockOut2: 50 },
        { mat: rawThai, stockOut1: 50, stockOut2: 50 },
        { mat: rawCappuccino, stockOut1: 50, stockOut2: 50 },
        { mat: rawLemonHoney, stockOut1: 50, stockOut2: 50 },
        { mat: rawLychee, stockOut1: 50, stockOut2: 50 },
        { mat: rawChoco, stockOut1: 50, stockOut2: 50 },
        { mat: rawApple, stockOut1: 50, stockOut2: 50 },
        { mat: rawOrange, stockOut1: 50, stockOut2: 50 },
        { mat: rawBlackcurrant, stockOut1: 50, stockOut2: 50 },
        { mat: rawMango, stockOut1: 50, stockOut2: 50 },
        { mat: rawMilkTea, stockOut1: 50, stockOut2: 50 },
        { mat: rawMatcha, stockOut1: 50, stockOut2: 50 },
        { mat: rawArenLatte, stockOut1: 50, stockOut2: 50 },
        { mat: rawCoconutLatte, stockOut1: 50, stockOut2: 50 },
        { mat: rawTehTarik, stockOut1: 50, stockOut2: 50 },
        { mat: rawTehKrampul, stockOut1: 50, stockOut2: 50 },
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

      // Daftar 15 Varian Resmi Vendor + Jasmine Tea Original
      const menuList = [
        { name: "Jasmine Poci Iced Tea", category: "original", priceReg: 5000, priceJumbo: 7000 },
        { name: "Thai Iced Tea", category: "milky", priceJumbo: 10000, flavorMaterialId: rawThai.id },
        { name: "Cappuccino Iced Tea", category: "milky", priceJumbo: 10000, flavorMaterialId: rawCappuccino.id },
        { name: "Lemon Honey Iced Tea", category: "fruity", priceJumbo: 10000, flavorMaterialId: rawLemonHoney.id },
        { name: "Lychee Iced Tea", category: "fruity", priceJumbo: 9000, flavorMaterialId: rawLychee.id },
        { name: "Chocolate Iced Tea", category: "milky", priceJumbo: 10000, flavorMaterialId: rawChoco.id },
        { name: "Apple Iced Tea", category: "fruity", priceJumbo: 9000, flavorMaterialId: rawApple.id },
        { name: "Orange Iced Tea", category: "fruity", priceJumbo: 9000, flavorMaterialId: rawOrange.id },
        { name: "Blackcurrant Iced Tea", category: "fruity", priceJumbo: 10000, flavorMaterialId: rawBlackcurrant.id },
        { name: "Mango Iced Tea", category: "fruity", priceJumbo: 9000, flavorMaterialId: rawMango.id },
        { name: "Milk Iced Tea", category: "milky", priceJumbo: 10000, flavorMaterialId: rawMilkTea.id },
        { name: "Matcha Iced Tea", category: "milky", priceJumbo: 10000, flavorMaterialId: rawMatcha.id },
        { name: "Aren Latte Iced Tea", category: "milky", priceJumbo: 10000, flavorMaterialId: rawArenLatte.id },
        { name: "Coconut Latte Iced Tea", category: "milky", priceJumbo: 10000, flavorMaterialId: rawCoconutLatte.id },
        { name: "Teh Tarik Gula Aren", category: "milky", priceJumbo: 10000, flavorMaterialId: rawTehTarik.id },
        { name: "Teh Krampul Selasih", category: "fruity", priceJumbo: 10000, flavorMaterialId: rawTehKrampul.id },
      ];

      const createdProducts = [];

      for (const item of menuList) {
        if (!item.flavorMaterialId && item.priceReg) {
          const prodReg = await prisma.product.create({
            data: { name: `${item.name} (Reguler)`, price: item.priceReg, category: item.category, active_status: true },
          });
          const bomRegData = [
            { product_id: prodReg.id, raw_material_id: cupReg.id, quantity: 1 },
          ];
          await prisma.bOM_Recipe.createMany({ data: bomRegData });
          createdProducts.push(prodReg);
        }

        const prodJumbo = await prisma.product.create({
          data: { name: `${item.name} (Jumbo)`, price: item.priceJumbo, category: item.category, active_status: true },
        });
        const bomJumboData = [
          { product_id: prodJumbo.id, raw_material_id: cupJumbo.id, quantity: 1 },
        ];
        if (item.flavorMaterialId) {
          bomJumboData.push({ product_id: prodJumbo.id, raw_material_id: item.flavorMaterialId, quantity: 1 });
        }
        await prisma.bOM_Recipe.createMany({ data: bomJumboData });
        createdProducts.push(prodJumbo);
      }

      const topping = await prisma.product.create({
        data: { name: "Extra Creamy Topping", price: 3000, category: "topping", active_status: true },
      });
      await prisma.bOM_Recipe.create({
        data: { product_id: topping.id, raw_material_id: rawCreamyTopping.id, quantity: 1 },
      });
      createdProducts.push(topping);

      for (const p of createdProducts) {
        await prisma.outletProduct.create({
          data: { outlet_id: outlet1.id, product_id: p.id, is_available: true },
        });
        await prisma.outletProduct.create({
          data: { outlet_id: outlet2.id, product_id: p.id, is_available: true },
        });
      }

      return NextResponse.json({
        success: true,
        message: "Database berhasil di-reset total ke pengaturan pabrik (Seed default: 2 Kedai, 18 Menu Resmi Vendor, Stok Awal Segar).",
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

