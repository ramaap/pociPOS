import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminPin } from "@/lib/pin";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const pin = searchParams.get("pin");

    const ADMIN_PIN = getAdminPin();
    if (pin && pin !== ADMIN_PIN) {
      return NextResponse.json({ error: "PIN Admin tidak valid." }, { status: 401 });
    }

    const rawMaterials = await prisma.rawMaterial.findMany({
      orderBy: { name: "asc" },
      include: {
        boothStocks: {
          include: {
            outlet: {
              select: { id: true, name: true, code: true },
            },
          },
        },
      },
    });

    const transferLogs = await prisma.stockTransferLog.findMany({
      orderBy: { created_at: "desc" },
      take: 50,
      include: {
        raw_material: true,
      },
    });

    const outlets = await prisma.outlet.findMany({
      select: { id: true, name: true, code: true },
      orderBy: { code: "asc" },
    });

    return NextResponse.json({
      success: true,
      rawMaterials,
      transferLogs,
      outlets,
    });
  } catch (error: any) {
    console.error("Master stock fetch error:", error);
    return NextResponse.json({ error: error?.message || "Gagal memuat master stock." }, { status: 500 });
  }
}

