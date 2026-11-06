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
                outlet_id,
                raw_material_id: item.raw_material_id,
              },
            },
            update: {
              current_stock: item.current_stock,
            },
            create: {
              outlet_id,
              raw_material_id: item.raw_material_id,
              current_stock: item.current_stock,
            },
          });
        }
      }
    }

    // 2. Update status kedai: Buka Shift (Open), set cash float, dan rekam waktu opening
    const updatedOutlet = await prisma.outlet.update({
      where: { id: outlet_id },
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
