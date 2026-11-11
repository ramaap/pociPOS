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

    const outlet = await prisma.outlet.findUnique({
      where: { id: outletId },
      include: {
        stocks: {
          include: {
            raw_material: true,
          },
          orderBy: {
            raw_material: {
              name: "asc",
            },
          },
        },
      },
    });

    if (!outlet) {
      return NextResponse.json({ error: "Kedai tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({ outlet });
  } catch (error) {
    console.error("Gagal mengambil data opening:", error);
    return NextResponse.json({ error: "Gagal mengambil data opening kedai" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { outlet_id, cash_float, stocks, notes } = body;

    if (!outlet_id) {
      return NextResponse.json({ error: "Kedai wajib dipilih" }, { status: 400 });
    }

    const outlet = await prisma.outlet.findFirst({
      where: {
        OR: [
          { id: outlet_id },
          { code: outlet_id },
        ],
      },
    });

    if (!outlet) {
      return NextResponse.json({ error: "Kedai tidak ditemukan" }, { status: 404 });
    }

    const resolvedOutletId = outlet.id;

    const cashFloatNum = Number(cash_float);
    if (isNaN(cashFloatNum) || cashFloatNum < 0) {
      return NextResponse.json(
        { error: "Nominal uang cash yang dibawa harus berupa angka 0 atau lebih" },
        { status: 400 }
      );
    }

    // 1. Update ketersediaan stok fisik jika ada penyesuaian / restock saat opening
    if (stocks && Array.isArray(stocks)) {
      for (const item of stocks) {
        if (item.raw_material_id && typeof item.current_stock === "number" && item.current_stock >= 0) {
          await prisma.boothStock.upsert({
            where: {
              outlet_id_raw_material_id: {
                outlet_id: resolvedOutletId,
                raw_material_id: item.raw_material_id,
              },
            },
            update: {
              current_stock: item.current_stock,
            },
            create: {
              outlet_id: resolvedOutletId,
              raw_material_id: item.raw_material_id,
              current_stock: item.current_stock,
            },
          });
        }
      }
    }

    // 2. Tambahan cairan gula yang dibawa kasir saat buka shift (misal sirup matang dari rumah/central kitchen)
    const addedSugarMl = Number(body.added_sugar_brought_ml) || 0;
    if (addedSugarMl > 0) {
      let gulaCairMat = await prisma.rawMaterial.findFirst({
        where: { name: { contains: "Gula Cair" } },
      });
      if (!gulaCairMat) {
        gulaCairMat = await prisma.rawMaterial.create({
          data: { name: "Gula Cair", unit: "ml" },
        });
      }

      const existingSugarStock = await prisma.boothStock.findUnique({
        where: {
          outlet_id_raw_material_id: {
            outlet_id: resolvedOutletId,
            raw_material_id: gulaCairMat.id,
          },
        },
      });

      const stockBefore = existingSugarStock?.current_stock || 0;
      const stockAfter = stockBefore + addedSugarMl;

      await prisma.boothStock.upsert({
        where: {
          outlet_id_raw_material_id: {
            outlet_id: resolvedOutletId,
            raw_material_id: gulaCairMat.id,
          },
        },
        update: {
          current_stock: stockAfter,
        },
        create: {
          outlet_id: resolvedOutletId,
          raw_material_id: gulaCairMat.id,
          current_stock: stockAfter,
        },
      });

      await prisma.sugarRefillLog.create({
        data: {
          outlet_id: resolvedOutletId,
          amount_ml: addedSugarMl,
          stock_before: stockBefore,
          stock_after: stockAfter,
          type: "opening_brought",
          notes: notes
            ? `Bawa gula cair saat buka shift: ${notes}`
            : `Bawa sirup gula matang saat buka shift (+${addedSugarMl} ml)`,
        },
      });
    }

    // 3. Update status kedai: Buka Shift (Open), set cash float, dan rekam waktu opening
    const updatedOutlet = await prisma.outlet.update({
      where: { id: resolvedOutletId },
      data: {
        initial_cash: cashFloatNum,
        shift_status: "open",
        last_opened_at: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: `Kedai ${updatedOutlet.name} berhasil dibuka! Shift operasional aktif.`,
      outlet: updatedOutlet,
    });
  } catch (error) {
    console.error("Error opening shift:", error);
    return NextResponse.json({ error: "Gagal memproses opening kedai" }, { status: 500 });
  }
}

