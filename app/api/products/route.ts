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

    // 4. Tentukan Waktu Mulai Shift untuk Kedai Terpilih
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const selectedOutletObj = outlets.find((o) => o.id === selectedOutletId);
    const isShiftClosed = selectedOutletObj?.shift_status === "closed";
    
    // Jika shift aktif, hitung dari waktu buka shift (last_opened_at) atau hari ini
    const shiftStartTime = selectedOutletObj?.last_opened_at
      ? new Date(selectedOutletObj.last_opened_at)
      : todayStart;

    let todayCupsSold = 0;
    let todayCashIn = 0;
    let todayExpenseTotal = 0;

    if (!isShiftClosed) {
      // Hitung total cup terjual pada shift aktif
      const todayItems = await prisma.transactionItem.findMany({
        where: {
          transaction: {
            created_at: { gte: shiftStartTime },
            ...(selectedOutletId && { outlet_id: selectedOutletId }),
          },
        },
        select: {
          quantity: true,
        },
      });
      todayCupsSold = todayItems.reduce((acc, curr) => acc + (curr.quantity || 0), 0);

      // Hitung Pemasukan Uang Cash (Tunai) pada shift aktif
      const todayCashTransactions = await prisma.transaction.findMany({
        where: {
          created_at: { gte: shiftStartTime },
          payment_method: { in: ["Cash", "cash", "tunai", "Tunai"] },
          ...(selectedOutletId && { outlet_id: selectedOutletId }),
        },
        select: {
          total_amount: true,
        },
      });
      todayCashIn = todayCashTransactions.reduce((acc, curr) => acc + (curr.total_amount || 0), 0);

      // Hitung Pengeluaran Kasir pada shift aktif
      const todayExpenses = await prisma.expense.findMany({
        where: {
          date: { gte: shiftStartTime },
          ...(selectedOutletId && { outlet_id: selectedOutletId }),
        },
        select: {
          amount: true,
        },
      });
      todayExpenseTotal = todayExpenses.reduce((acc, curr) => acc + (curr.amount || 0), 0);
    }

    const initialCash = selectedOutletObj?.initial_cash || 0;
    const todayCashBalance = initialCash + todayCashIn - todayExpenseTotal;

    // 6. Ambil status kampanye promo waktu terbatas (Beli 2 Varian Rasa Gratis 1 Teh Ori Jumbo)
    let promoCampaignData: any = await prisma.promoCampaign.findUnique({
      where: { id: "buy2_get1" },
    });
    if (!promoCampaignData) {
      const now = new Date();
      promoCampaignData = await prisma.promoCampaign.create({
        data: {
          id: "buy2_get1",
          name: "Promo Beli 2 Varian Rasa Gratis 1 Teh Ori Jumbo",
          is_active: true,
          start_at: now,
          end_at: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
          min_flavored_qty: 2,
          free_product_name: "Jasmine Poci Iced Tea (Jumbo)",
        },
      });
    }

    const now = new Date();
    let isCampaignActive = promoCampaignData.is_active;
    let campaignStatus: "active" | "scheduled" | "expired" | "inactive" | "outlet_not_targeted" = "active";
    if (!promoCampaignData.is_active) {
      campaignStatus = "inactive";
      isCampaignActive = false;
    } else if (promoCampaignData.start_at && now < new Date(promoCampaignData.start_at)) {
      campaignStatus = "scheduled";
      isCampaignActive = false;
    } else if (promoCampaignData.end_at && now > new Date(promoCampaignData.end_at)) {
      campaignStatus = "expired";
      isCampaignActive = false;
    } else if (promoCampaignData.target_outlet_id && promoCampaignData.target_outlet_id !== selectedOutletId) {
      campaignStatus = "outlet_not_targeted";
      isCampaignActive = false;
    }

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
      shift_status: selectedOutletObj?.shift_status || "open",
      last_opened_at: selectedOutletObj?.last_opened_at || null,
      last_closed_at: selectedOutletObj?.last_closed_at || null,
      promoCampaign: {
        ...promoCampaignData,
        isCurrentlyActive: isCampaignActive,
        status: campaignStatus,
      },
    });
  } catch (error) {
    console.error("Failed to fetch products and outlet stock:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data produk dan stok outlet" },
      { status: 500 }
    );
  }
}
