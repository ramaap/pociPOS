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
          outlet_id: outletId,
          raw_material_id: gulaCairMat.id,
        },
      },
    });

    const currentStock = boothStock?.current_stock || 0;
    const cupsJumboLeft = Math.floor(currentStock / 40);

    return NextResponse.json({
      success: true,
      rawMaterialId: gulaCairMat.id,
      current_stock: currentStock,
      cupsJumboLeft,
      isLow: cupsJumboLeft <= 6,
    });
  } catch (error: any) {
    console.error("Gagal mengambil stok gula cair:", error);
    return NextResponse.json({ error: error?.message || "Gagal mengambil data gula" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { outletId, addedMl, setMl } = body;

    if (!outletId) {
      return NextResponse.json({ error: "Outlet ID wajib disertakan" }, { status: 400 });
    }

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
          outlet_id: outletId,
          raw_material_id: gulaCairMat.id,
        },
      },
    });

    let newStock = existingStock?.current_stock || 0;

    if (typeof setMl === "number") {
      newStock = Math.max(0, Math.round(setMl));
    } else if (typeof addedMl === "number") {
      newStock = Math.max(0, Math.round(newStock + addedMl));
    } else {
      return NextResponse.json({ error: "addedMl atau setMl wajib disertakan" }, { status: 400 });
    }

    const updated = await prisma.boothStock.upsert({
      where: {
        outlet_id_raw_material_id: {
          outlet_id: outletId,
          raw_material_id: gulaCairMat.id,
        },
      },
      update: {
        current_stock: newStock,
      },
      create: {
        outlet_id: outletId,
        raw_material_id: gulaCairMat.id,
        current_stock: newStock,
      },
    });

    return NextResponse.json({
      success: true,
      rawMaterialId: gulaCairMat.id,
      current_stock: updated.current_stock,
      cupsJumboLeft: Math.floor(updated.current_stock / 40),
      message: `Stok cairan gula berhasil diperbarui menjadi ${updated.current_stock} ml`,
    });
  } catch (error: any) {
    console.error("Gagal update stok gula cair:", error);
    return NextResponse.json({ error: error?.message || "Gagal memperbarui stok gula" }, { status: 500 });
  }
}
