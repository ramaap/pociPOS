import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const outletId = searchParams.get("outletId");
    const period = searchParams.get("period") || "today";

    const whereClause: any = {};
    if (outletId && outletId !== "all") {
      whereClause.outlet_id = outletId;
    }

    if (period === "today") {
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      whereClause.date = { gte: startOfDay, lte: endOfDay };
    }

    const expenses = await prisma.expense.findMany({
      where: whereClause,
      include: { outlet: true },
      orderBy: { date: "desc" },
    });

    const totalAmount = expenses.reduce((acc, curr) => acc + curr.amount, 0);

    return NextResponse.json({
      success: true,
      expenses,
      totalAmount,
      count: expenses.length,
    });
  } catch (error: any) {
    console.error("GET /api/expenses error:", error);
    return NextResponse.json({ error: error?.message || "Gagal memuat catatan pengeluaran" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { outletId, category = "operasional", description, amount, date } = body;

    if (!description || !description.trim()) {
      return NextResponse.json({ error: "Deskripsi pengeluaran wajib diisi" }, { status: 400 });
    }

    const numericAmount = Number(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return NextResponse.json({ error: "Nominal pengeluaran harus berupa angka positif" }, { status: 400 });
    }

    if (outletId && outletId !== "all") {
      const outlet = await prisma.outlet.findUnique({ where: { id: outletId } });
      if (outlet?.shift_status === "closed") {
        return NextResponse.json(
          { error: "Shift kedai masih tutup. Silakan buka shift terlebih dahulu untuk mencatat pengeluaran." },
          { status: 400 }
        );
      }
    }

    const newExpense = await prisma.expense.create({
      data: {
        outlet_id: outletId && outletId !== "all" ? outletId : null,
        category: category || "operasional",
        description: description.trim(),
        amount: numericAmount,
        date: date ? new Date(date) : new Date(),
      },
      include: { outlet: true },
    });

    return NextResponse.json({
      success: true,
      message: `Pengeluaran "${newExpense.description}" (Rp ${newExpense.amount.toLocaleString("id-ID")}) berhasil dicatat.`,
      expense: newExpense,
    });
  } catch (error: any) {
    console.error("POST /api/expenses error:", error);
    return NextResponse.json({ error: error?.message || "Gagal mencatat pengeluaran" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    let id = searchParams.get("id");

    if (!id) {
      try {
        const body = await req.json();
        id = body.id;
      } catch {
        // query param fallback
      }
    }

    if (!id) {
      return NextResponse.json({ error: "ID pengeluaran wajib disertakan" }, { status: 400 });
    }

    await prisma.expense.delete({ where: { id } });

    return NextResponse.json({
      success: true,
      message: "Catatan pengeluaran berhasil dihapus.",
    });
  } catch (error: any) {
    console.error("DELETE /api/expenses error:", error);
    return NextResponse.json({ error: error?.message || "Gagal menghapus pengeluaran" }, { status: 500 });
  }
}

