import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding Multi-Outlet Es Teh Poci System...");

  // 1. Bersihkan data lama
  await prisma.bOM_Recipe.deleteMany();
  await prisma.transactionItem.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.shiftClosing.deleteMany();
  await prisma.boothStock.deleteMany();
  await prisma.product.deleteMany();
  await prisma.rawMaterial.deleteMany();
  await prisma.outlet.deleteMany();

  // 2. Buat Multi-Outlet (Contoh: 2 Kedai / Booth di Teras Minimarket)
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

  console.log("✅ Dibuat Outlets:", [outlet1.name, outlet2.name]);

  // 3. Raw Materials Katalog Pusat (Central Kitchen)
  const cupReg = await prisma.rawMaterial.create({ data: { name: "Cup Reguler", unit: "pcs" } });
  const cupJumbo = await prisma.rawMaterial.create({ data: { name: "Cup Jumbo", unit: "pcs" } });
  const kantongTeh = await prisma.rawMaterial.create({ data: { name: "Kantong Teh", unit: "pcs" } });

  const rawVanilla = await prisma.rawMaterial.create({ data: { name: "Sachet Vanilla", unit: "sachet" } });
  const rawThai = await prisma.rawMaterial.create({ data: { name: "Sachet Thai Tea", unit: "sachet" } });
  const rawMilkTea = await prisma.rawMaterial.create({ data: { name: "Sachet Milk Tea", unit: "sachet" } });
  const rawChoco = await prisma.rawMaterial.create({ data: { name: "Sachet Cokelat", unit: "sachet" } });
  const rawLychee = await prisma.rawMaterial.create({ data: { name: "Sachet Lychee", unit: "sachet" } });
  const rawCappuccino = await prisma.rawMaterial.create({ data: { name: "Sachet Cappuccino", unit: "sachet" } });
  const rawGuava = await prisma.rawMaterial.create({ data: { name: "Sachet Guava", unit: "sachet" } });
  const rawMango = await prisma.rawMaterial.create({ data: { name: "Sachet Mango", unit: "sachet" } });
  const rawBlackcurrant = await prisma.rawMaterial.create({ data: { name: "Sachet Blackcurrant", unit: "sachet" } });
  const rawApple = await prisma.rawMaterial.create({ data: { name: "Sachet Apple", unit: "sachet" } });
  const rawOrange = await prisma.rawMaterial.create({ data: { name: "Sachet Orange", unit: "sachet" } });
  const rawLemonHoney = await prisma.rawMaterial.create({ data: { name: "Sachet Lemon Honey", unit: "sachet" } });
  const rawCreamyTopping = await prisma.rawMaterial.create({ data: { name: "Sachet Extra Creamy", unit: "sachet" } });

  const allRawMaterials = [
    { mat: cupReg, stockOut1: 300, stockOut2: 250 },
    { mat: cupJumbo, stockOut1: 250, stockOut2: 200 },
    { mat: kantongTeh, stockOut1: 50, stockOut2: 40 }, // 50 pcs & 40 pcs kantong teh
    { mat: rawVanilla, stockOut1: 50, stockOut2: 50 },
    { mat: rawThai, stockOut1: 50, stockOut2: 50 },
    { mat: rawMilkTea, stockOut1: 50, stockOut2: 50 },
    { mat: rawChoco, stockOut1: 50, stockOut2: 50 },
    { mat: rawLychee, stockOut1: 50, stockOut2: 50 },
    { mat: rawCappuccino, stockOut1: 50, stockOut2: 50 },
    { mat: rawGuava, stockOut1: 50, stockOut2: 50 },
    { mat: rawMango, stockOut1: 50, stockOut2: 50 },
    { mat: rawBlackcurrant, stockOut1: 50, stockOut2: 50 },
    { mat: rawApple, stockOut1: 50, stockOut2: 50 },
    { mat: rawOrange, stockOut1: 50, stockOut2: 50 },
    { mat: rawLemonHoney, stockOut1: 50, stockOut2: 50 },
    { mat: rawCreamyTopping, stockOut1: 50, stockOut2: 50 },
  ];

  // 4. Inisialisasi Stok Mandiri per Outlet (BoothStock)
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

  console.log("✅ Berhasil menginisialisasi stok terpisah untuk Kedai #1 dan Kedai #2!");

  // 5. Daftar 13 Varian Resmi dari Poster
  const menuList = [
    { name: "Jasmine Poci Iced Tea", category: "original", priceReg: 5000, priceJumbo: 7000 },
    { name: "Vanilla Poci Iced Tea", category: "original", priceReg: 6000, priceJumbo: 8000, flavorMaterialId: rawVanilla.id },
    { name: "Thai Iced Tea", category: "milky", priceReg: 8000, priceJumbo: 10000, flavorMaterialId: rawThai.id },
    { name: "Milk Iced Tea", category: "milky", priceReg: 8000, priceJumbo: 10000, flavorMaterialId: rawMilkTea.id },
    { name: "Chocolate Iced Tea", category: "milky", priceReg: 8000, priceJumbo: 10000, flavorMaterialId: rawChoco.id },
    { name: "Lychee Iced Tea", category: "fruity", priceReg: 7000, priceJumbo: 9000, flavorMaterialId: rawLychee.id },
    { name: "Cappuccino Iced Tea", category: "milky", priceReg: 8000, priceJumbo: 10000, flavorMaterialId: rawCappuccino.id },
    { name: "Guava Iced Tea", category: "fruity", priceReg: 7000, priceJumbo: 9000, flavorMaterialId: rawGuava.id },
    { name: "Mango Iced Tea", category: "fruity", priceReg: 7000, priceJumbo: 9000, flavorMaterialId: rawMango.id },
    { name: "Blackcurrant Iced Tea", category: "fruity", priceReg: 7000, priceJumbo: 9000, flavorMaterialId: rawBlackcurrant.id },
    { name: "Apple Iced Tea", category: "fruity", priceReg: 7000, priceJumbo: 9000, flavorMaterialId: rawApple.id },
    { name: "Orange Iced Tea", category: "fruity", priceReg: 7000, priceJumbo: 9000, flavorMaterialId: rawOrange.id },
    { name: "Lemon Honey Iced Tea", category: "fruity", priceReg: 8000, priceJumbo: 10000, flavorMaterialId: rawLemonHoney.id },
  ];

  for (const item of menuList) {
    // Varian rasa standar vendor hanya disajikan ukuran Jumbo (1 sachet rasa).
    // Hanya Jasmine Tea original yang memiliki opsi Reguler & Jumbo.
    if (!item.flavorMaterialId && item.priceReg) {
      const prodReg = await prisma.product.create({
        data: { name: `${item.name} (Reguler)`, price: item.priceReg, active_status: true },
      });
      const bomRegData = [
        { product_id: prodReg.id, raw_material_id: cupReg.id, quantity: 1 },
      ];
      await prisma.bOM_Recipe.createMany({ data: bomRegData });
    }

    const prodJumbo = await prisma.product.create({
      data: { name: `${item.name} (Jumbo)`, price: item.priceJumbo, active_status: true },
    });
    const bomJumboData = [
      { product_id: prodJumbo.id, raw_material_id: cupJumbo.id, quantity: 1 },
    ];
    if (item.flavorMaterialId) {
      bomJumboData.push({ product_id: prodJumbo.id, raw_material_id: item.flavorMaterialId, quantity: 1 });
    }
    await prisma.bOM_Recipe.createMany({ data: bomJumboData });
  }

  const topping = await prisma.product.create({
    data: { name: "Extra Creamy Topping", price: 3000, active_status: true },
  });
  await prisma.bOM_Recipe.create({
    data: { product_id: topping.id, raw_material_id: rawCreamyTopping.id, quantity: 1 },
  });

  console.log("✅ Multi-Outlet Database Seed Selesai!");
}

main().finally(async () => await prisma.$disconnect());
