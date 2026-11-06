import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const outletId = searchParams.get("outletId");

    // 1. Ambil daftar semua outlet aktif
    const outlets = await prisma.outlet.findMany({
      where: { active_status: true },
      orderBy: { code: "asc" },
    });

    // Validasi outlet terpilih: Pastikan ID yang diminta benar-benar ada di daftar outlet aktif
    const activeOutletMatch = outlets.find((o) => o.id === outletId);
    const selectedOutletId = activeOutletMatch
      ? activeOutletMatch.id
      : outlets.length > 0
      ? outlets[0].id
      : null;

    // 2. Ambil produk & resep BOM yang aktif
    const rawProducts = await prisma.product.findMany({
      where: { active_status: true },
      include: {
        recipes: {
          include: {
            raw_material: true,
          },
        },
        ...(selectedOutletId && {
          outletProducts: {
            where: { outlet_id: selectedOutletId },
          },
        }),
      },
      orderBy: { price: "asc" },
    });

    // Hitung total kuantitas cup terjual per produk dari riwayat transaksi
    const salesGroup = await prisma.transactionItem.groupBy({
      by: ["product_id"],
      _sum: {
        quantity: true,
      },
    });

    const salesMap: Record<string, number> = {};
    for (const item of salesGroup) {
      if (item.product_id) {
        salesMap[item.product_id] = item._sum.quantity || 0;
      }
    }

    // Filter ketersediaan menu per kedai (jika is_available: false, sembunyikan dari POS kedai ini)
    const products = rawProducts
      .filter((p: any) => {
        if (!selectedOutletId || !p.outletProducts || p.outletProducts.length === 0) {
          return true;
        }
        return p.outletProducts[0].is_available;
      })
      .map((p: any) => ({
        ...p,
        total_sold: salesMap[p.id] || 0,
      }));

    // 3. Ambil stok spesifik milik outlet terpilih
    let boothStocks: any[] = [];
    if (selectedOutletId) {
      boothStocks = await prisma.boothStock.findMany({
        where: { outlet_id: selectedOutletId },
        include: { raw_material: true },
      });
    }

    // Format rawMaterials agar kompatibel dengan UI kasir
    const rawMaterials = boothStocks.map((bs) => ({
      id: bs.raw_material.id,
      name: bs.raw_material.name,
      unit: bs.raw_material.unit,
      current_stock: bs.current_stock,
    }));

    // 4. Hitung total cup terjual hari ini untuk outlet terpilih
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayItems = await prisma.transactionItem.findMany({
      where: {
        transaction: {
          created_at: { gte: todayStart },
          ...(selectedOutletId && { outlet_id: selectedOutletId }),
        },
      },
      select: {
        quantity: true,
      },
    });

    const todayCupsSold = todayItems.reduce((acc, curr) => acc + (curr.quantity || 0), 0);

    // 5. Hitung Pemasukan Uang Cash (Tunai) & Pengeluaran Hari Ini untuk Kedai Terpilih
    const todayCashTransactions = await prisma.transaction.findMany({
      where: {
        created_at: { gte: todayStart },
        payment_method: { in: ["Cash", "cash", "tunai", "Tunai"] },
        ...(selectedOutletId && { outlet_id: selectedOutletId }),
      },
      select: {
        total_amount: true,
      },
    });
    const todayCashIn = todayCashTransactions.reduce((acc, curr) => acc + (curr.total_amount || 0), 0);

    const todayExpenses = await prisma.expense.findMany({
      where: {
        date: { gte: todayStart },
        ...(selectedOutletId && { outlet_id: selectedOutletId }),
      },
      select: {
        amount: true,
      },
    });
    const todayExpenseTotal = todayExpenses.reduce((acc, curr) => acc + (curr.amount || 0), 0);
    const selectedOutletObj = outlets.find((o) => o.id === selectedOutletId);
    const initialCash = selectedOutletObj?.initial_cash || 0;
    const todayCashBalance = initialCash + todayCashIn - todayExpenseTotal;

    return NextResponse.json({
      outlets,
      selectedOutletId,
      products,
      rawMaterials,
      todayCupsSold,
      initialCash,
      todayCashIn,
      todayExpenseTotal,
      todayCashBalance,
    });
  } catch (error) {
    console.error("Failed to fetch products and outlet stock:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data produk dan stok outlet" },
      { status: 500 }
    );
  }
}
