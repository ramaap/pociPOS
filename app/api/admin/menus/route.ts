import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const outletId = searchParams.get("outletId");

    // Ambil semua produk aktif dan resep BOM
    const products = await prisma.product.findMany({
      where: { active_status: true },
      include: {
        recipes: {
          include: {
            raw_material: true,
          },
        },
        outletProducts: true,
      },
      orderBy: { name: "asc" },
    });

    // Ambil semua bahan baku untuk pilihan formula resep saat buat menu baru
    const rawMaterials = await prisma.rawMaterial.findMany({
      orderBy: { name: "asc" },
    });

    // Ambil semua outlet
    const outlets = await prisma.outlet.findMany({
      where: { active_status: true },
      orderBy: { code: "asc" },
    });

    return NextResponse.json({
      products,
      rawMaterials,
      outlets,
      selectedOutletId: outletId || (outlets[0]?.id ?? null),
    });
  } catch (error) {
    console.error("Failed to fetch admin menus:", error);
    return NextResponse.json({ error: "Gagal mengambil data menu" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action } = body;

    // 1. TAMBAH MENU BARU (MENDUKUNG REGULER & JUMBO SEKALIGUS DALAM 1 FORM)
    if (action === "create_menu" || action === "create_product") {
      const {
        baseName,
        name,
        category = "fruity",
        enableReguler = true,
        regulerPrice,
        regulerTeaMl = 300,
        regulerFlavorQty = 30,
        enableJumbo = true,
        jumboPrice,
        jumboTeaMl = 400,
        jumboFlavorQty = 40,
        flavorMaterialId,
        // Legacy single creation support:
        price,
        recipes,
      } = body;

      const rawName = (baseName || name || "").trim();
      // Bersihkan suffix jika ada
      const cleanBaseName = rawName
        .replace(/\s*[\(\[]?(reguler|regular|jumbo)[\)\]]?/gi, "")
        .trim();

      if (!cleanBaseName) {
        return NextResponse.json({ error: "Nama menu wajib diisi" }, { status: 400 });
      }

      // Ambil bahan baku standar
      const regCupMat = await prisma.rawMaterial.findFirst({
        where: { name: { contains: "Cup Reguler" } },
      });
      const jumboCupMat = await prisma.rawMaterial.findFirst({
        where: { name: { contains: "Cup Jumbo" } },
      });
      const premixMat = await prisma.rawMaterial.findFirst({
        where: { name: { contains: "Tea Premix" } },
      });

      const allOutlets = await prisma.outlet.findMany({ where: { active_status: true } });
      const createdProducts = [];

      // Helper untuk link outlet
      const linkOutlets = async (prodId: string) => {
        if (allOutlets.length > 0) {
          for (const o of allOutlets) {
            await prisma.outletProduct.upsert({
              where: { outlet_id_product_id: { outlet_id: o.id, product_id: prodId } },
              update: { is_available: true },
              create: { outlet_id: o.id, product_id: prodId, is_available: true },
            });
          }
        }
      };

      // KASUS A: Kategori Topping (Single item, tanpa Reguler/Jumbo)
      if (category === "topping") {
        const topPrice = Number(regulerPrice || price || 3000);
        let prod = await prisma.product.findUnique({ where: { name: cleanBaseName } });
        if (prod) {
          prod = await prisma.product.update({
            where: { id: prod.id },
            data: { price: topPrice, category: "topping", active_status: true },
          });
        } else {
          prod = await prisma.product.create({
            data: { name: cleanBaseName, price: topPrice, category: "topping", active_status: true },
          });
        }

        // Resep BOM
        await prisma.bOM_Recipe.deleteMany({ where: { product_id: prod.id } });
        if (flavorMaterialId && Number(regulerFlavorQty) > 0) {
          await prisma.bOM_Recipe.create({
            data: {
              product_id: prod.id,
              raw_material_id: flavorMaterialId,
              quantity: Number(regulerFlavorQty),
            },
          });
        }
        await linkOutlets(prod.id);
        createdProducts.push(prod);

        return NextResponse.json({
          success: true,
          message: `Topping '${prod.name}' berhasil ditambahkan ke katalog.`,
          products: createdProducts,
        });
      }

      // KASUS B: Minuman dengan Dual Pilihan (Reguler & Jumbo Sekaligus)
      // 1. Buat Varian Reguler
      if (enableReguler) {
        const pRegPrice = Number(regulerPrice || price);
        if (!pRegPrice || isNaN(pRegPrice)) {
          return NextResponse.json({ error: "Harga Reguler wajib diisi angka yang valid." }, { status: 400 });
        }

        const regName = `${cleanBaseName} (Reguler)`;
        let regProd = await prisma.product.findUnique({ where: { name: regName } });
        if (regProd) {
          regProd = await prisma.product.update({
            where: { id: regProd.id },
            data: { price: pRegPrice, category, active_status: true },
          });
        } else {
          regProd = await prisma.product.create({
            data: { name: regName, price: pRegPrice, category, active_status: true },
          });
        }

        // Resep BOM Reguler
        await prisma.bOM_Recipe.deleteMany({ where: { product_id: regProd.id } });
        if (regCupMat) {
          await prisma.bOM_Recipe.create({
            data: { product_id: regProd.id, raw_material_id: regCupMat.id, quantity: 1 },
          });
        }
        if (flavorMaterialId && Number(regulerFlavorQty) > 0) {
          await prisma.bOM_Recipe.create({
            data: { product_id: regProd.id, raw_material_id: flavorMaterialId, quantity: Number(regulerFlavorQty) },
          });
        }

        await linkOutlets(regProd.id);
        createdProducts.push(regProd);
      }

      // 2. Buat Varian Jumbo
      if (enableJumbo) {
        const pJumboPrice = Number(jumboPrice);
        if (!pJumboPrice || isNaN(pJumboPrice)) {
          return NextResponse.json({ error: "Harga Jumbo wajib diisi angka yang valid." }, { status: 400 });
        }

        const jumboName = `${cleanBaseName} (Jumbo)`;
        let jumboProd = await prisma.product.findUnique({ where: { name: jumboName } });
        if (jumboProd) {
          jumboProd = await prisma.product.update({
            where: { id: jumboProd.id },
            data: { price: pJumboPrice, category, active_status: true },
          });
        } else {
          jumboProd = await prisma.product.create({
            data: { name: jumboName, price: pJumboPrice, category, active_status: true },
          });
        }

        // Resep BOM Jumbo
        await prisma.bOM_Recipe.deleteMany({ where: { product_id: jumboProd.id } });
        if (jumboCupMat) {
          await prisma.bOM_Recipe.create({
            data: { product_id: jumboProd.id, raw_material_id: jumboCupMat.id, quantity: 1 },
          });
        }
        if (flavorMaterialId && Number(jumboFlavorQty) > 0) {
          await prisma.bOM_Recipe.create({
            data: { product_id: jumboProd.id, raw_material_id: flavorMaterialId, quantity: Number(jumboFlavorQty) },
          });
        }

        await linkOutlets(jumboProd.id);
        createdProducts.push(jumboProd);
      }

      return NextResponse.json({
        success: true,
        message: `Menu '${cleanBaseName}' berhasil disimpan (Reguler & Jumbo terhubung ke semua kedai).`,
        products: createdProducts,
      });
    }

    // 2. EDIT / UPDATE MENU MASTER PUSAT
    if (action === "update_menu") {
      const {
        oldBaseName,
        baseName,
        category = "fruity",
        enableReguler = false,
        regulerPrice,
        enableJumbo = true,
        jumboPrice,
        flavorMaterialId,
        price,
      } = body;

      const cleanOldBase = (oldBaseName || "").replace(/\s*[\(\[]?(reguler|regular|jumbo)[\)\]]?/gi, "").trim();
      const cleanNewBase = (baseName || cleanOldBase).replace(/\s*[\(\[]?(reguler|regular|jumbo)[\)\]]?/gi, "").trim();

      if (!cleanNewBase) {
        return NextResponse.json({ error: "Nama menu tidak boleh kosong" }, { status: 400 });
      }

      // Ambil bahan baku cup standar
      const regCupMat = await prisma.rawMaterial.findFirst({
        where: { name: { contains: "Cup Reguler" } },
      });
      const jumboCupMat = await prisma.rawMaterial.findFirst({
        where: { name: { contains: "Cup Jumbo" } },
      });

      const allOutlets = await prisma.outlet.findMany({ where: { active_status: true } });
      const linkOutlets = async (prodId: string) => {
        if (allOutlets.length > 0) {
          for (const o of allOutlets) {
            await prisma.outletProduct.upsert({
              where: { outlet_id_product_id: { outlet_id: o.id, product_id: prodId } },
              update: { is_available: true },
              create: { outlet_id: o.id, product_id: prodId, is_available: true },
            });
          }
        }
      };

      // Cari produk-produk lama yang berhubungan dengan cleanOldBase
      const existingProducts = await prisma.product.findMany({
        where: {
          OR: [
            { name: cleanOldBase },
            { name: `${cleanOldBase} (Reguler)` },
            { name: `${cleanOldBase} (Jumbo)` },
            { name: { startsWith: `${cleanOldBase} (` } },
          ],
        },
      });

      const updatedProducts = [];

      // KASUS A: Kategori Topping
      if (category === "topping") {
        const topPrice = Number(price || regulerPrice || 3000);
        let topProd =
          existingProducts.find((p) => !/\((reguler|regular|jumbo)\)/i.test(p.name)) ||
          (await prisma.product.findUnique({ where: { name: cleanNewBase } }));

        if (topProd) {
          topProd = await prisma.product.update({
            where: { id: topProd.id },
            data: { name: cleanNewBase, price: topPrice, category: "topping", active_status: true },
          });
        } else {
          topProd = await prisma.product.create({
            data: { name: cleanNewBase, price: topPrice, category: "topping", active_status: true },
          });
        }

        // BOM Recipe
        await prisma.bOM_Recipe.deleteMany({ where: { product_id: topProd.id } });
        if (flavorMaterialId) {
          await prisma.bOM_Recipe.create({
            data: { product_id: topProd.id, raw_material_id: flavorMaterialId, quantity: 1 },
          });
        }
        await linkOutlets(topProd.id);
        updatedProducts.push(topProd);

        // Nonaktifkan varian reguler/jumbo lama jika sebelumnya minuman
        for (const ep of existingProducts) {
          if (ep.id !== topProd.id) {
            await prisma.product.update({ where: { id: ep.id }, data: { active_status: false } });
          }
        }

        return NextResponse.json({
          success: true,
          message: `Menu Topping '${cleanNewBase}' berhasil diperbarui.`,
          products: updatedProducts,
        });
      }

      // KASUS B: Minuman Reguler & Jumbo
      // 1. Handle Varian Reguler
      const regName = `${cleanNewBase} (Reguler)`;
      let regProd =
        existingProducts.find((p) => /\((reguler|regular)\)/i.test(p.name)) ||
        (await prisma.product.findUnique({ where: { name: regName } }));

      if (enableReguler) {
        const pRegPrice = Number(regulerPrice);
        if (!pRegPrice || isNaN(pRegPrice)) {
          return NextResponse.json({ error: "Harga Reguler wajib diisi angka yang valid." }, { status: 400 });
        }

        if (regProd) {
          regProd = await prisma.product.update({
            where: { id: regProd.id },
            data: { name: regName, price: pRegPrice, category, active_status: true },
          });
        } else {
          regProd = await prisma.product.create({
            data: { name: regName, price: pRegPrice, category, active_status: true },
          });
        }

        // Update BOM Reguler (Cup Reguler + Flavor Sachet)
        await prisma.bOM_Recipe.deleteMany({ where: { product_id: regProd.id } });
        if (regCupMat) {
          await prisma.bOM_Recipe.create({
            data: { product_id: regProd.id, raw_material_id: regCupMat.id, quantity: 1 },
          });
        }
        if (flavorMaterialId) {
          await prisma.bOM_Recipe.create({
            data: { product_id: regProd.id, raw_material_id: flavorMaterialId, quantity: 1 },
          });
        }
        await linkOutlets(regProd.id);
        updatedProducts.push(regProd);
      } else if (regProd) {
        const txCount = await prisma.transactionItem.count({ where: { product_id: regProd.id } });
        if (txCount === 0) {
          await prisma.bOM_Recipe.deleteMany({ where: { product_id: regProd.id } });
          await prisma.outletProduct.deleteMany({ where: { product_id: regProd.id } });
          await prisma.product.delete({ where: { id: regProd.id } });
        } else {
          await prisma.product.update({
            where: { id: regProd.id },
            data: { active_status: false },
          });
        }
      }

      // 2. Handle Varian Jumbo
      const jumboName = `${cleanNewBase} (Jumbo)`;
      let jumboProd =
        existingProducts.find((p) => /\(jumbo\)/i.test(p.name)) ||
        (await prisma.product.findUnique({ where: { name: jumboName } }));

      if (enableJumbo) {
        const pJumboPrice = Number(jumboPrice);
        if (!pJumboPrice || isNaN(pJumboPrice)) {
          return NextResponse.json({ error: "Harga Jumbo wajib diisi angka yang valid." }, { status: 400 });
        }

        if (jumboProd) {
          jumboProd = await prisma.product.update({
            where: { id: jumboProd.id },
            data: { name: jumboName, price: pJumboPrice, category, active_status: true },
          });
        } else {
          jumboProd = await prisma.product.create({
            data: { name: jumboName, price: pJumboPrice, category, active_status: true },
          });
        }

        // Update BOM Jumbo (Cup Jumbo + Flavor Sachet)
        await prisma.bOM_Recipe.deleteMany({ where: { product_id: jumboProd.id } });
        if (jumboCupMat) {
          await prisma.bOM_Recipe.create({
            data: { product_id: jumboProd.id, raw_material_id: jumboCupMat.id, quantity: 1 },
          });
        }
        if (flavorMaterialId) {
          await prisma.bOM_Recipe.create({
            data: { product_id: jumboProd.id, raw_material_id: flavorMaterialId, quantity: 1 },
          });
        }
        await linkOutlets(jumboProd.id);
        updatedProducts.push(jumboProd);
      } else if (jumboProd) {
        const txCount = await prisma.transactionItem.count({ where: { product_id: jumboProd.id } });
        if (txCount === 0) {
          await prisma.bOM_Recipe.deleteMany({ where: { product_id: jumboProd.id } });
          await prisma.outletProduct.deleteMany({ where: { product_id: jumboProd.id } });
          await prisma.product.delete({ where: { id: jumboProd.id } });
        } else {
          await prisma.product.update({
            where: { id: jumboProd.id },
            data: { active_status: false },
          });
        }
      }

      return NextResponse.json({
        success: true,
        message: `Menu '${cleanNewBase}' berhasil diperbarui!`,
        products: updatedProducts,
      });
    }

    // 2. TOGGLE KETERSEDIAAN MENU PER KEDAI (Aktifkan / Nonaktifkan di Outlet Tertentu)
    if (action === "toggle_outlet_menu") {
      const { outletId, productId, isAvailable } = body;

      if (!outletId || !productId) {
        return NextResponse.json({ error: "outletId dan productId wajib disertakan" }, { status: 400 });
      }

      const entry = await prisma.outletProduct.upsert({
        where: {
          outlet_id_product_id: {
            outlet_id: outletId,
            product_id: productId,
          },
        },
        update: {
          is_available: Boolean(isAvailable),
        },
        create: {
          outlet_id: outletId,
          product_id: productId,
          is_available: Boolean(isAvailable),
        },
      });

      return NextResponse.json({
        success: true,
        message: `Status menu untuk kedai berhasil diubah.`,
        data: entry,
      });
    }

    // 3. TOGGLE KETERSEDIAAN MENU GROUP (Semua ukuran untuk baseName di suatu kedai)
    if (action === "toggle_outlet_menu_group") {
      const { outletId, productIds, isAvailable } = body;

      if (!outletId || !Array.isArray(productIds)) {
        return NextResponse.json({ error: "outletId dan productIds wajib disertakan" }, { status: 400 });
      }

      for (const pId of productIds) {
        await prisma.outletProduct.upsert({
          where: { outlet_id_product_id: { outlet_id: outletId, product_id: pId } },
          update: { is_available: Boolean(isAvailable) },
          create: { outlet_id: outletId, product_id: pId, is_available: Boolean(isAvailable) },
        });
      }

      return NextResponse.json({
        success: true,
        message: `Status varian menu untuk kedai berhasil diperbarui.`,
      });
    }

    // 4. HAPUS / NONAKTIFKAN MENU SECARA GLOBAL (SINGLE ATAU GROUP)
    if (action === "delete_product" || action === "delete_menu_group") {
      const { productId, productIds, baseName } = body;

      let idsToDelete: string[] = [];
      if (productId) {
        idsToDelete = [productId];
      } else if (Array.isArray(productIds) && productIds.length > 0) {
        idsToDelete = productIds;
      } else if (baseName) {
        const found = await prisma.product.findMany({
          where: {
            OR: [
              { name: baseName },
              { name: `${baseName} (Reguler)` },
              { name: `${baseName} (Jumbo)` },
              { name: { startsWith: `${baseName} (` } },
            ],
          },
          select: { id: true },
        });
        idsToDelete = found.map((f) => f.id);
      }

      if (idsToDelete.length === 0) {
        return NextResponse.json({ error: "Target menu yang akan dihapus tidak ditemukan" }, { status: 400 });
      }

      let deletedCount = 0;
      let deactivatedCount = 0;

      for (const id of idsToDelete) {
        const product = await prisma.product.findUnique({
          where: { id },
          include: {
            _count: {
              select: { transactionItems: true },
            },
          },
        });

        if (!product) continue;

        // Jika sudah pernah terjual, soft delete agar histori pembukuan tidak rusak
        if (product._count.transactionItems > 0) {
          await prisma.product.update({
            where: { id },
            data: { active_status: false },
          });
          deactivatedCount++;
        } else {
          // Jika belum ada histori penjualan, hapus bersih
          await prisma.bOM_Recipe.deleteMany({ where: { product_id: id } });
          await prisma.outletProduct.deleteMany({ where: { product_id: id } });
          await prisma.product.delete({ where: { id } });
          deletedCount++;
        }
      }

      return NextResponse.json({
        success: true,
        message: `Menu berhasil diproses (${deletedCount} dihapus permanen, ${deactivatedCount} dinonaktifkan aman).`,
      });
    }

    return NextResponse.json({ error: "Action tidak dikenali" }, { status: 400 });
  } catch (error: any) {
    console.error("Menu management error:", error);
    return NextResponse.json({ error: error?.message || "Gagal memproses menu" }, { status: 500 });
  }
}
