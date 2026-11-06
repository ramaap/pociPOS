import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const MATERIAL_MAP: Record<string, { newName: string; unit: string; defaultStock: number }> = {
  "Vanilla Syrup": { newName: "Sachet Vanilla", unit: "sachet", defaultStock: 50 },
  "Thai Tea Mix": { newName: "Sachet Thai Tea", unit: "sachet", defaultStock: 50 },
  "Milk Tea Mix": { newName: "Sachet Milk Tea", unit: "sachet", defaultStock: 50 },
  "Chocolate Powder": { newName: "Sachet Cokelat", unit: "sachet", defaultStock: 50 },
  "Lychee Syrup": { newName: "Sachet Lychee", unit: "sachet", defaultStock: 50 },
  "Cappuccino Mix": { newName: "Sachet Cappuccino", unit: "sachet", defaultStock: 50 },
  "Guava Syrup": { newName: "Sachet Guava", unit: "sachet", defaultStock: 50 },
  "Mango Syrup": { newName: "Sachet Mango", unit: "sachet", defaultStock: 50 },
  "Blackcurrant Syrup": { newName: "Sachet Blackcurrant", unit: "sachet", defaultStock: 50 },
  "Apple Syrup": { newName: "Sachet Apple", unit: "sachet", defaultStock: 50 },
  "Orange Syrup": { newName: "Sachet Orange", unit: "sachet", defaultStock: 50 },
  "Lemon Honey Syrup": { newName: "Sachet Lemon Honey", unit: "sachet", defaultStock: 50 },
  "Extra Creamy Foam": { newName: "Sachet Extra Creamy", unit: "sachet", defaultStock: 50 },
};

async function main() {
  console.log("🔄 Migrating raw materials from syrup/powder to sachet rasa...");

  const allRawMaterials = await prisma.rawMaterial.findMany();

  for (const mat of allRawMaterials) {
    const target = MATERIAL_MAP[mat.name];
    if (target) {
      console.log(`Updating ${mat.name} -> ${target.newName} (${target.unit})`);
      await prisma.rawMaterial.update({
        where: { id: mat.id },
        data: {
          name: target.newName,
          unit: target.unit,
        },
      });

      // Update booth stocks for this material
      const stocks = await prisma.boothStock.findMany({
        where: { raw_material_id: mat.id },
      });

      for (const stock of stocks) {
        // If stock is huge (like 4000-5000 from old gram/ml), adjust to sachet count
        const newStockQty = stock.current_stock > 100 ? 50 : Math.max(0, Math.round(stock.current_stock));
        await prisma.boothStock.update({
          where: { id: stock.id },
          data: { current_stock: newStockQty },
        });
      }
    }
  }

  // Update BOM recipes so all sachet flavors are exactly 1 sachet per drink
  const sachetMaterials = await prisma.rawMaterial.findMany({
    where: { unit: "sachet" },
  });
  const sachetIds = sachetMaterials.map((m) => m.id);

  const recipes = await prisma.bOM_Recipe.findMany({
    where: {
      raw_material_id: { in: sachetIds },
    },
  });

  for (const r of recipes) {
    await prisma.bOM_Recipe.update({
      where: { id: r.id },
      data: { quantity: 1 },
    });
  }

  console.log(`✅ Updated ${recipes.length} BOM recipes to use 1 sachet.`);
  console.log("🎉 Migration to sachet finished successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
