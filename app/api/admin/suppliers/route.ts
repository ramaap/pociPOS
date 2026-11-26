import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const suppliers = await prisma.supplier.findMany({
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ suppliers });
  } catch (error) {
    console.error("GET suppliers error:", error);
    return NextResponse.json({ error: "Gagal mengambil data supplier" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const name = String(body?.name || "").trim();
    const phone = body?.phone ? String(body.phone).trim() : null;
    const category = String(body?.category || "umum").trim();
    const leadTimeDays = Math.max(1, parseInt(String(body?.lead_time_days || "1"), 10) || 1);
    const notes = body?.notes ? String(body.notes).trim() : null;

    if (!name) {
      return NextResponse.json({ error: "Nama supplier wajib diisi" }, { status: 400 });
    }

    const supplier = await prisma.supplier.create({
      data: {
        name,
        phone,
        category,
        lead_time_days: leadTimeDays,
        notes,
      },
    });

    return NextResponse.json({ success: true, supplier }, { status: 201 });
  } catch (error) {
    console.error("POST supplier error:", error);
    return NextResponse.json({ error: "Gagal menyimpan supplier" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "ID supplier diperlukan" }, { status: 400 });
    }

    await prisma.supplier.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE supplier error:", error);
    return NextResponse.json({ error: "Gagal menghapus supplier" }, { status: 500 });
  }
}
