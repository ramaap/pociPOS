import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminPin } from "@/lib/pin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const pin = searchParams.get("pin");
    const outletId = searchParams.get("outletId"); // "all" atau spesifik outletId

    const ADMIN_PIN = getAdminPin();
    if (pin !== ADMIN_PIN) {
      return NextResponse.json({ error: "Akses ditolak: PIN Admin tidak valid." }, { status: 401 });
    }

    // 1. Ambil Semua Outlet untuk Filter Dropdown & Hitung Saldo Kas Real-time
    const rawOutlets = await prisma.outlet.findMany({
      orderBy: { code: "asc" },
    });

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const outlets = await Promise.all(
      rawOutlets.map(async (outlet) => {
        const isShiftClosed = outlet.shift_status === "closed";
        const shiftStartTime = outlet.last_opened_at ? new Date(outlet.last_opened_at) : todayStart;

        let todayCupsSold = 0;
        let todayCashIn = 0;
        let todayExpenseTotal = 0;

        if (!isShiftClosed) {
          const todayItems = await prisma.transactionItem.findMany({
            where: {
              transaction: {
                outlet_id: outlet.id,
                created_at: { gte: shiftStartTime },
              },
            },
            select: { quantity: true },
          });
          todayCupsSold = todayItems.reduce((acc, curr) => acc + (curr.quantity || 0), 0);

          const cashTxs = await prisma.transaction.findMany({
            where: {
              outlet_id: outlet.id,
              created_at: { gte: shiftStartTime },
              payment_method: { in: ["Cash", "cash", "tunai", "Tunai"] },
            },
            select: { total_amount: true },
          });
          todayCashIn = cashTxs.reduce((acc, curr) => acc + (curr.total_amount || 0), 0);

          const expenses = await prisma.expense.findMany({
            where: {
              outlet_id: outlet.id,
              date: { gte: shiftStartTime },
            },
            select: { amount: true },
          });
          todayExpenseTotal = expenses.reduce((acc, curr) => acc + (curr.amount || 0), 0);
        }

        const initialCash = outlet.initial_cash || 0;
        const currentCashBalance = initialCash + todayCashIn - todayExpenseTotal;

        return {
          ...outlet,
          todayCupsSold,
          todayCashIn,
          todayExpenseTotal,
          currentCashBalance,
        };
      })
    );

    const outletFilter = outletId && outletId !== "all" ? { outlet_id: outletId } : {};

    // 2. Ambil Shift Closings dengan Relasi Outlet
    const closings = await prisma.shiftClosing.findMany({
      where: outletFilter,
      include: { outlet: true },
      orderBy: { created_at: "desc" },
      take: 50,
    });

    // 3. Ambil Stok Bahan Baku per Outlet
    const boothStocks = await prisma.boothStock.findMany({
      where: outletFilter,
      include: {
        outlet: true,
        raw_material: true,
      },
      orderBy: [{ outlet_id: "asc" }, { raw_material_id: "asc" }],
    });

    // 4. Hitung Penjualan Hari Ini
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayTransactions = await prisma.transaction.findMany({
      where: {
        created_at: { gte: today },
        ...outletFilter,
      },
      include: {
        outlet: true,
        items: {
          include: { product: true },
        },
      },
      orderBy: { created_at: "desc" },
    });

    const totalSalesToday = todayTransactions.reduce((sum, tx) => sum + tx.total_amount, 0);
    const qrisSalesToday = todayTransactions
      .filter((t) => t.payment_method === "QRIS")
      .reduce((sum, tx) => sum + tx.total_amount, 0);
    const cashSalesToday = todayTransactions
      .filter((t) => t.payment_method === "Cash")
      .reduce((sum, tx) => sum + tx.total_amount, 0);

    let totalRegCupsSold = 0;
    let totalJumboCupsSold = 0;
    let totalLiquidMlSold = 0;
    const flavorStats: Record<string, number> = {};
    const outletSalesMap: Record<string, { name: string; sales: number; cups: number }> = {};

    // Init outlet sales map
    for (const out of outlets) {
      outletSalesMap[out.id] = { name: out.name, sales: 0, cups: 0 };
    }

    for (const tx of todayTransactions) {
      if (outletSalesMap[tx.outlet_id]) {
        outletSalesMap[tx.outlet_id].sales += tx.total_amount;
      }

      for (const item of tx.items) {
        const prodName = item.product.name;
        flavorStats[prodName] = (flavorStats[prodName] || 0) + item.quantity;
        if (outletSalesMap[tx.outlet_id]) {
          outletSalesMap[tx.outlet_id].cups += item.quantity;
        }

        if (prodName.toLowerCase().includes("reguler")) {
          totalRegCupsSold += item.quantity;
          totalLiquidMlSold += item.quantity * 300;
        } else if (prodName.toLowerCase().includes("jumbo")) {
          totalJumboCupsSold += item.quantity;
          totalLiquidMlSold += item.quantity * 450;
        }
      }
    }

    return NextResponse.json({
      outlets,
      summary: {
        totalSalesToday,
        qrisSalesToday,
        cashSalesToday,
        transactionCount: todayTransactions.length,
        totalRegCupsSold,
        totalJumboCupsSold,
        totalLiquidMlSold,
        flavorStats,
        outletSalesList: Object.values(outletSalesMap),
      },
      closings,
      boothStocks,
      todayTransactions,
    }, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
  } catch (error) {
    console.error("Admin reconciliation fetch error:", error);
    return NextResponse.json(
      { error: "Gagal memuat data rekonsiliasi admin multi-outlet" },
      { status: 500 }
    );
  }
}
