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
      await prisma.rndExpense.deleteMany();
      await prisma.capitalAsset.deleteMany();
      await prisma.initialCapital.deleteMany();
      await prisma.fixedCost.deleteMany();
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
      const gulaCair = await prisma.rawMaterial.create({ data: { name: "Gula Cair", unit: "ml" } });
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
        { mat: gulaCair, stockOut1: 5000, stockOut2: 5000 },
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
        { name: "Matcha Latte", category: "milky", priceJumbo: 10000, flavorMaterialId: rawMatcha.id, secondaryFlavorMaterialId: rawMilkTea.id },
        { name: "Aren Latte Iced Tea", category: "milky", priceJumbo: 10000, flavorMaterialId: rawArenLatte.id },
        { name: "Coconut Latte Iced Tea", category: "milky", priceJumbo: 10000, flavorMaterialId: rawCoconutLatte.id },
        { name: "Teh Tarik Gula Aren", category: "milky", priceJumbo: 10000, flavorMaterialId: rawTehTarik.id },
        { name: "Teh Krampul Selasih", category: "fruity", priceJumbo: 10000, flavorMaterialId: rawTehKrampul.id },
      ];

      const createdProducts = [];

      for (const item of menuList) {
        if (!item.flavorMaterialId && item.priceReg) {
          const regBreakdown = [
            { name: "Poci Jasmine Kantong (180ml)", cost: 170 },
            { name: "Gula Pasir Rose Brand (40ml)", cost: 558 },
            { name: "Cup Es Teh Reguler Poci", cost: 600 },
            { name: "Sedotan Poci Single Wrap", cost: 93 },
            { name: "Plastik Seal Kecil", cost: 200 },
            { name: "Estimasi Air Galon", cost: 71 },
            { name: "Estimasi Es Batu Kristal", cost: 250 },
            { name: "Estimasi Kantong Plastik Cup", cost: 50 },
          ];
          const prodReg = await prisma.product.create({
            data: {
              name: `${item.name} (Reguler)`,
              price: item.priceReg,
              cost_price: 1992,
              hpp_breakdown: JSON.stringify(regBreakdown),
              category: item.category,
              active_status: true,
            },
          });
          const bomRegData = [
            { product_id: prodReg.id, raw_material_id: cupReg.id, quantity: 1 },
            { product_id: prodReg.id, raw_material_id: gulaCair.id, quantity: 40 },
          ];
          await prisma.bOM_Recipe.createMany({ data: bomRegData });
          createdProducts.push(prodReg);
        }

        const isOriginal = !item.flavorMaterialId;
        const jumBreakdown = [
          { name: "Poci Jasmine Kantong Jumbo", cost: 188 },
          { name: "Gula Pasir Rose Brand (1 kg)", cost: 697 },
          { name: "Cup Es Teh 22 oz Poci", cost: 800 },
          { name: "Sedotan Poci Single Wrap", cost: 93 },
          { name: "Plastik Seal Kecil", cost: 200 },
          { name: "Estimasi Air Galon (8 liter)", cost: 79 },
          { name: "Estimasi Es Batu Kristal (250 g)", cost: 300 },
          { name: "Estimasi Kantong Plastik Cup", cost: 50 },
        ];
        if (!isOriginal) {
          let mixName = "Poci Mix";
          let mixCost = 1000;
          const n = item.name.toLowerCase();
          if (n.includes("apple") || n.includes("blackcurrant") || n.includes("mango") || n.includes("orange")) {
            mixName = `Poci Mix ${item.name} 3g`;
            mixCost = 850;
          } else if (n.includes("lemon honey") || n.includes("lychee")) {
            mixName = `Poci Mix ${item.name} 3g`;
            mixCost = 1000;
          } else if (n.includes("milk tea")) {
            mixName = "Poci Mix Milk Tea 15g";
            mixCost = 1500;
          } else if (n.includes("krampul")) {
            mixName = "ETP Teh Krampul Selasih";
            mixCost = 1500;
          } else if (n.includes("cappuccino")) {
            mixName = "Poci Mix Cappuccino 10g";
            mixCost = 1600;
          } else if (n.includes("chocolate")) {
            mixName = "Poci Mix Chocolate";
            mixCost = 1600;
          } else if (n.includes("tarik")) {
            mixName = "ETP Teh Tarik Gula Aren";
            mixCost = 2000;
          } else if (n.includes("thai")) {
            mixName = "Poci Mix Thai Tea 12g";
            mixCost = 2500;
            jumBreakdown.push({ name: mixName, cost: mixCost });
          } else if (n.includes("matcha")) {
            jumBreakdown.push({ name: "Poci Mix Matcha 12g", cost: 3000 });
            jumBreakdown.push({ name: "Poci Mix Milk Tea 15g", cost: 1500 });
          } else if (n.includes("aren latte")) {
            mixName = "Poci Mix Aren Latte 25g";
            mixCost = 3000;
            jumBreakdown.push({ name: mixName, cost: mixCost });
          } else if (n.includes("coconut latte")) {
            mixName = "Poci Mix Coconut Latte 25g";
            mixCost = 3000;
            jumBreakdown.push({ name: mixName, cost: mixCost });
          } else {
            jumBreakdown.push({ name: mixName, cost: mixCost });
          }
        }
        const jumTotalHpp = jumBreakdown.reduce((a, b) => a + b.cost, 0);

        const prodJumbo = await prisma.product.create({
          data: {
            name: `${item.name} (Jumbo)`,
            price: item.priceJumbo,
            cost_price: jumTotalHpp,
            hpp_breakdown: JSON.stringify(jumBreakdown),
            category: item.category,
            active_status: true,
          },
        });
        const bomJumboData = [
          { product_id: prodJumbo.id, raw_material_id: cupJumbo.id, quantity: 1 },
          { product_id: prodJumbo.id, raw_material_id: gulaCair.id, quantity: 50 },
        ];
        if (item.flavorMaterialId) {
          bomJumboData.push({ product_id: prodJumbo.id, raw_material_id: item.flavorMaterialId, quantity: 1 });
        }
        if ((item as any).secondaryFlavorMaterialId) {
          bomJumboData.push({ product_id: prodJumbo.id, raw_material_id: (item as any).secondaryFlavorMaterialId, quantity: 1 });
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

      // Seed default fixed costs
      const defaultFixedCosts = [
        { name: "Sewa Tempat / Booth Teras", amount: 1000000, category: "sewa", notes: "Sewa teras bulanan per kedai/booth" },
        { name: "Gaji Pokok Kasir / Karyawan", amount: 1500000, category: "gaji", notes: "Gaji operasional kasir jaga kedai per bulan" },
        { name: "Listrik & Utilitas Kedai", amount: 300000, category: "utilitas", notes: "Token listrik sealer/blender dan air seduhan" },
        { name: "Iuran Kebersihan & Keamanan", amount: 100000, category: "kebersihan", notes: "Retribusi sampah & keamanan teras" },
        { name: "Internet & Wi-Fi POS", amount: 150000, category: "utilitas", notes: "Koneksi online POS & mesin QRIS" },
      ];
      for (const fc of defaultFixedCosts) {
        await prisma.fixedCost.create({ data: fc });
      }

      // Seed Modal Awal (Equity Injection), Pembelian Aset Tetap (CAPEX), dan Pengeluaran RnD
      await prisma.initialCapital.create({
        data: {
          source: "Modal Pribadi Pemilik (Tabungan Awal Usaha)",
          amount: 20000000,
          date: new Date(),
          notes: "Rekening BCA Bisnis Es Teh Poci Multi-Kedai",
        },
      });

      await prisma.capitalAsset.createMany({
        data: [
          {
            name: "Booth Kayu Display & Meja Bar Sudirman",
            category: "booth",
            asset_type: "tidak_bergerak",
            cost: 5000000,
            outlet_id: outlet1.id,
            purchase_date: new Date(),
            notes: "Booth resmi standar kemitraan Teh Poci (Masa pakai panjang / nilai stabil)",
          },
          {
            name: "Mesin Cup Sealer Eton D8 Sudirman",
            category: "mesin",
            asset_type: "bergerak",
            cost: 850000,
            outlet_id: outlet1.id,
            purchase_date: new Date(),
            notes: "Mesin sealer otomatis cup reguler & jumbo (Masa pakai terbatas)",
          },
          {
            name: "Dispenser Stainless Steel 12L & Cooler Box",
            category: "peralatan",
            asset_type: "bergerak",
            cost: 600000,
            outlet_id: outlet1.id,
            purchase_date: new Date(),
            notes: "Termos stainless larutan teh dan wadah es batu",
          },
          {
            name: "Booth Kayu Display & Meja Bar Diponegoro",
            category: "booth",
            asset_type: "tidak_bergerak",
            cost: 5000000,
            outlet_id: outlet2.id,
            purchase_date: new Date(),
            notes: "Booth resmi standar kemitraan Teh Poci (Masa pakai panjang / nilai stabil)",
          },
          {
            name: "Mesin Cup Sealer Eton D8 Diponegoro",
            category: "mesin",
            asset_type: "bergerak",
            cost: 850000,
            outlet_id: outlet2.id,
            purchase_date: new Date(),
            notes: "Mesin sealer otomatis cup reguler & jumbo (Masa pakai terbatas)",
          },
          {
            name: "Tablet POS Android & Thermal Bluetooth Printer",
            category: "pos",
            asset_type: "bergerak",
            cost: 1500000,
            purchase_date: new Date(),
            notes: "Perangkat kasir POS pusat dan nota transaksi (Masa pakai terbatas)",
          },
        ],
      });

      await prisma.rndExpense.createMany({
        data: [
          {
            title: "Trial Resep Dual Sachet Matcha Latte (Matcha + Milk Tea)",
            category: "resep",
            amount: 250000,
            outcome: "Berhasil (Masuk Menu)",
            date: new Date(),
            notes: "Eksperimen proporsi susu dan matcha hingga rasa optimal",
          },
          {
            title: "Uji Coba Kemasan Cup Ramah Lingkungan & Ketahanan Seal",
            category: "packaging",
            amount: 150000,
            outcome: "Dalam Evaluasi",
            date: new Date(),
            notes: "Trial 50 cup tester bahan biodegradable anti bocor",
          },
        ],
      });

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

