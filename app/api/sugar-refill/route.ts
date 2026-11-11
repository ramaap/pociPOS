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

    // Rekam ke SugarRefillLog untuk audit log Owner
    const logType = type || (typeof addedMl === "number" ? "brew" : "manual_adjust");
    const logNotes = notes || (logType === "brew" ? `Selesai masak sirup gula di kedai (+${deltaMl} ml)` : "Penyesuaian stok gula cair");

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
      auditLog,
      message: `Stok cairan gula berhasil diperbarui menjadi ${updated.current_stock} ml`,
    });
  } catch (error: any) {
    console.error("Gagal update stok gula cair:", error);
    return NextResponse.json({ error: error?.message || "Gagal memperbarui stok gula" }, { status: 500 });
  }
}
