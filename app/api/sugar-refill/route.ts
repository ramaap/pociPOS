import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const outletId = searchParams.get("outletId");

    if (!outletId) {
      return NextResponse.json({ error: "Outlet ID diperlukan" }, { status: 400 });
    }

    const outlet = await prisma.outlet.findFirst({
      where: {
        OR: [
          { id: outletId },
          { code: outletId },
        ],
      },
    });

    if (!outlet) {
      return NextResponse.json({ error: "Outlet tidak ditemukan" }, { status: 404 });
    }

    const resolvedOutletId = outlet.id;

    const gulaCairMat = await prisma.rawMaterial.findFirst({
      where: {
        name: {
          contains: "Gula Cair",
        },
      },
    });

    if (!gulaCairMat) {
      return NextResponse.json({ error: "Bahan baku Gula Cair belum terdaftar di katalog" }, { status: 404 });
    }

    const boothStock = await prisma.boothStock.findUnique({
      where: {
        outlet_id_raw_material_id: {
          outlet_id: resolvedOutletId,
          raw_material_id: gulaCairMat.id,
        },
      },
    });

    const currentStock = boothStock?.current_stock || 0;
    const cupsJumboLeft = Math.floor(currentStock / 40);

    // Ambil Stok Gula Pasir di Kedai Ini
    const gulaPasirMat = await prisma.rawMaterial.findFirst({
      where: {
        name: {
          contains: "Gula Pasir",
        },
      },
    });

    let gulaPasirStock = 0;
    if (gulaPasirMat) {
      const gpStock = await prisma.boothStock.findUnique({
        where: {
          outlet_id_raw_material_id: {
            outlet_id: resolvedOutletId,
            raw_material_id: gulaPasirMat.id,
          },
        },
      });
      gulaPasirStock = gpStock?.current_stock || 0;
    }

    const recentLogs = await prisma.sugarRefillLog.findMany({
      where: { outlet_id: resolvedOutletId },
      orderBy: { created_at: "desc" },
      take: 10,
    });

    return NextResponse.json({
      success: true,
      outletId: resolvedOutletId,
      rawMaterialId: gulaCairMat.id,
      current_stock: currentStock,
      cupsJumboLeft,
      isLow: cupsJumboLeft <= 6,
      gulaPasirRawMaterialId: gulaPasirMat?.id,
      gulaPasirStock,
      gulaPasirBatchesLeft: Math.floor(gulaPasirStock / 1000),
      recentLogs,
    });
  } catch (error: any) {
    console.error("Gagal mengambil stok gula cair:", error);
    return NextResponse.json({ error: error?.message || "Gagal mengambil data gula" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { outletId, addedMl, setMl, type, notes } = body;

    if (!outletId) {
      return NextResponse.json({ error: "Outlet ID wajib disertakan" }, { status: 400 });
    }

    const outlet = await prisma.outlet.findFirst({
      where: {
        OR: [
          { id: outletId },
          { code: outletId },
        ],
      },
    });

    if (!outlet) {
      return NextResponse.json({ error: "Outlet tidak ditemukan" }, { status: 404 });
    }

    const resolvedOutletId = outlet.id;

    let gulaCairMat = await prisma.rawMaterial.findFirst({
      where: {
        name: {
          contains: "Gula Cair",
        },
      },
    });

    if (!gulaCairMat) {
      gulaCairMat = await prisma.rawMaterial.create({
        data: {
          name: "Gula Cair",
          unit: "ml",
        },
      });
    }

    const existingStock = await prisma.boothStock.findUnique({
      where: {
        outlet_id_raw_material_id: {
          outlet_id: resolvedOutletId,
          raw_material_id: gulaCairMat.id,
        },
      },
    });

    const stockBefore = existingStock?.current_stock || 0;
    let newStock = stockBefore;

    if (typeof setMl === "number") {
      newStock = Math.max(0, Math.round(setMl));
    } else if (typeof addedMl === "number") {
      newStock = Math.max(0, Math.round(newStock + addedMl));
    } else {
      return NextResponse.json({ error: "addedMl atau setMl wajib disertakan" }, { status: 400 });
    }

    const deltaMl = newStock - stockBefore;

    const updated = await prisma.boothStock.upsert({
      where: {
        outlet_id_raw_material_id: {
          outlet_id: resolvedOutletId,
          raw_material_id: gulaCairMat.id,
        },
      },
      update: {
        current_stock: newStock,
      },
      create: {
        outlet_id: resolvedOutletId,
        raw_material_id: gulaCairMat.id,
        current_stock: newStock,
      },
    });

    // Otomatis potong stok Gula Pasir di kedai saat masak sirup gula (type === "brew" atau penambahan batch)
    let gulaPasirDeducted = 0;
    let gulaPasirRemaining = 0;
    const isBrew = type === "brew" || (typeof addedMl === "number" && addedMl > 0);

    if (isBrew && deltaMl > 0) {
      // 1 batch standar (+1.600 ml) memotong 1.000 gr Gula Pasir
      gulaPasirDeducted = Math.round((deltaMl / 1600) * 1000);

      const gulaPasirMat = await prisma.rawMaterial.findFirst({
        where: { name: { contains: "Gula Pasir" } },
      });

      if (gulaPasirMat) {
        const gpStock = await prisma.boothStock.findUnique({
          where: {
            outlet_id_raw_material_id: {
              outlet_id: resolvedOutletId,
              raw_material_id: gulaPasirMat.id,
            },
          },
        });

        const currentGP = gpStock?.current_stock || 0;
        const newGP = Math.max(0, currentGP - gulaPasirDeducted);
        gulaPasirRemaining = newGP;

        await prisma.boothStock.upsert({
          where: {
            outlet_id_raw_material_id: {
              outlet_id: resolvedOutletId,
              raw_material_id: gulaPasirMat.id,
            },
          },
          update: { current_stock: newGP },
          create: {
            outlet_id: resolvedOutletId,
            raw_material_id: gulaPasirMat.id,
            current_stock: newGP,
          },
        });

        // Catat transfer log internal produksi sirup
        await prisma.stockTransferLog.create({
          data: {
            raw_material_id: gulaPasirMat.id,
            from_location: resolvedOutletId,
            to_location: resolvedOutletId,
            quantity: gulaPasirDeducted,
            type: "sugar_brew",
            notes: `Masak sirup gula +${deltaMl} ml di kedai (potong ${gulaPasirDeducted.toLocaleString("id-ID")} gr Gula Pasir)`,
          },
        });
      }
    }

    // Rekam ke SugarRefillLog untuk audit log Owner
    const logType = type || (typeof addedMl === "number" ? "brew" : "manual_adjust");
    const logNotes = notes || (logType === "brew"
      ? `Selesai masak sirup gula di kedai (+${deltaMl} ml)${gulaPasirDeducted > 0 ? ` [Potong Gula Pasir: -${gulaPasirDeducted.toLocaleString("id-ID")} gr]` : ""}`
      : "Penyesuaian stok gula cair");

    const auditLog = await prisma.sugarRefillLog.create({
      data: {
        outlet_id: resolvedOutletId,
        amount_ml: deltaMl,
        stock_before: stockBefore,
        stock_after: newStock,
        type: logType,
        notes: logNotes,
      },
    });

    return NextResponse.json({
      success: true,
      outletId: resolvedOutletId,
      rawMaterialId: gulaCairMat.id,
      current_stock: updated.current_stock,
      cupsJumboLeft: Math.floor(updated.current_stock / 40),
      gulaPasirDeducted,
      gulaPasirRemaining,
      auditLog,
      message: `Stok cairan gula berhasil diperbarui menjadi ${updated.current_stock.toLocaleString("id-ID")} ml` + (gulaPasirDeducted > 0 ? ` (Stok Gula Pasir terpotong -${gulaPasirDeducted.toLocaleString("id-ID")} gr, sisa: ${gulaPasirRemaining.toLocaleString("id-ID")} gr)` : ""),
    });
  } catch (error: any) {
    console.error("Gagal update stok gula cair:", error);
    return NextResponse.json({ error: error?.message || "Gagal memperbarui stok gula" }, { status: 500 });
  }
}
