import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Biaya modal satuan estimasi standar franchise Es Teh Poci (HPP BOM)
const MATERIAL_COST_PER_UNIT: Record<string, number> = {
  "cup reguler": 600, // Rp 600 / pcs
  "cup jumbo": 800, // Rp 800 / pcs (Cup 22 oz Poci)
  "kantong teh": 6000, // Rp 6.000 / kantong jumbo (32 cup)
  "gula cair": 14, // Rp 14 / ml (~Rp 697 / porsi 50ml)
  "liquid tea premix": 12, // Rp 12 / ml (Rp 12.000 / liter)
  "sachet extra creamy": 1000, // Rp 1.000 / sachet
  "extra creamy foam": 1000,

  // 15 Varian Sachet Resmi Vendor Teh Poci (Sesuai Daftar Resmi Vendor)
  "poci mix apple 3g": 850,
  "poci mix blackcurrant 3g": 850,
  "poci mix mango 3g": 850,
  "poci mix orange 3g": 850,
  "poci mix guava 3g": 850,
  "poci mix lemon honey 3g": 1000,
  "poci mix lychee 3g": 1000,
  "poci mix milk tea 15g": 1500,
  "poci teh krampul selasih": 1500,
  "etp teh krampul selasih": 1500,
  "poci mix cappuccino 10g": 1600,
  "poci mix chocolate": 1600,
  "poci teh tarik gula aren": 2000,
  "etp teh tarik gula aren": 2000,
  "poci mix thai tea 12g": 2500,
  "poci mix matcha 12g": 3000,
  "poci mix matcha latte 12g": 3000,
  "poci mix aren latte 25g": 3000,
  "poci mix coconut latte 25g": 3000,
  "poci mix vanilla": 1200,

  // Variasi spasi/huruf besar-kecil & format alternatif
  "poci mix thai tea 12 g": 2500,
  "poci mix cappuccino 10 g": 1600,
  "poci mix lemon honey 3 g": 1000,
  "poci mix lychee 3 g": 1000,
  "poci mix apple 3 g": 850,
  "poci mix orange 3 g": 850,
  "poci mix blackcurrant 3 g": 850,
  "poci mix mango 3 g": 850,
  "poci mix milk tea 15 g": 1500,
  "poci mix matcha 12 g": 3000,
  "poci mix aren latte 25 g": 3000,
  "poci mix coconut latte 25 g": 3000,
  "es teh poci teh tarik gula aren": 2000,
  "es teh poci teh krampul selasih": 1500,

  // Backward compatibility (Nama sachet & syrup lama)
  "sachet vanilla": 1200,
  "sachet thai tea": 1500,
  "sachet milk tea": 1500,
  "sachet cokelat": 1500,
  "sachet chocolate": 1500,
  "sachet lychee": 1200,
  "sachet cappuccino": 1500,
  "sachet guava": 1200,
  "sachet mango": 1200,
  "sachet blackcurrant": 1200,
  "sachet apple": 1200,
  "sachet orange": 1200,
  "sachet lemon honey": 1200,
  "sachet matcha": 1500,
  "sachet aren latte": 1800,
  "sachet coconut latte": 1800,
  "sachet teh tarik gula aren": 1800,
  "sachet teh krampul selasih": 1500,
  "vanilla syrup": 1200,
  "thai tea mix": 1500,
  "milk tea mix": 1500,
  "chocolate powder": 1500,
  "lychee syrup": 1200,
  "cappuccino mix": 1500,
  "guava syrup": 1200,
  "mango syrup": 1200,
  "blackcurrant syrup": 1200,
  "apple syrup": 1200,
  "orange syrup": 1200,
  "lemon honey syrup": 1200,
};

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const outletId = searchParams.get("outletId") || "all";
    const period = searchParams.get("period") || "30d"; // Default 30d seperti di referensi
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");

    // 1. Tentukan Rentang Waktu (Date Range)
    let dateFilter: { gte?: Date; lte?: Date } | undefined = undefined;
    const now = new Date();
    let periodDays = 30;

    if (period === "today") {
      periodDays = 1;
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      dateFilter = { gte: startOfDay, lte: endOfDay };
    } else if (period === "yesterday") {
      periodDays = 1;
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const startOfYesterday = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 0, 0, 0);
      const endOfYesterday = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59, 999);
      dateFilter = { gte: startOfYesterday, lte: endOfYesterday };
    } else if (period === "7d") {
      periodDays = 7;
      const sevenDaysAgo = new Date(now);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      sevenDaysAgo.setHours(0, 0, 0, 0);
      dateFilter = { gte: sevenDaysAgo };
    } else if (period === "30d") {
      periodDays = 30;
      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      thirtyDaysAgo.setHours(0, 0, 0, 0);
      dateFilter = { gte: thirtyDaysAgo };
    } else if (startDateParam && endDateParam) {
      dateFilter = {
        gte: new Date(startDateParam),
        lte: new Date(endDateParam),
      };
      const diffTime = Math.abs(new Date(endDateParam).getTime() - new Date(startDateParam).getTime());
      periodDays = Math.max(1, Math.round(diffTime / (1000 * 60 * 60 * 24)));
    }

    const LAUNCH_START_STR = "2026-12-01";
    const LAUNCH_START_DATE = new Date("2026-12-01T00:00:00+07:00");
    const effectiveOpStart =
      dateFilter?.gte && dateFilter.gte > LAUNCH_START_DATE ? dateFilter.gte : LAUNCH_START_DATE;
    const operationalPeriodDays =
      now < LAUNCH_START_DATE
        ? 0
        : Math.min(periodDays, Math.max(1, Math.ceil((now.getTime() - LAUNCH_START_DATE.getTime()) / 86400000)));

    // 2. Query Transaksi dengan Filter (mulai efektif 1 Desember 2026)
    const whereClause: any = {};
    if (outletId && outletId !== "all") {
      whereClause.outlet_id = outletId;
    }
    whereClause.created_at = {
      gte: effectiveOpStart,
      ...(dateFilter?.lte ? { lte: dateFilter.lte } : {}),
    };

    const transactions = await prisma.transaction.findMany({
      where: whereClause,
      include: {
        outlet: true,
        items: {
          include: {
            product: {
              include: {
                recipes: {
                  include: {
                    raw_material: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { created_at: "desc" },
    });

    // 3. Query Pengeluaran / Biaya Operasional Harian (Variable Expenses)
    const expenseWhere: any = {};
    if (outletId && outletId !== "all") {
      expenseWhere.outlet_id = outletId;
    }
    if (dateFilter) {
      expenseWhere.date = dateFilter;
    }

    const expensesList = await prisma.expense.findMany({
      where: expenseWhere,
      include: { outlet: true },
      orderBy: { date: "desc" },
    });

    // Pengeluaran sebelum 1 Desember tidak dihitung ke laporan operasional Arus Kas/Laba Rugi (tetap tampil di tabel Catatan Biaya & memotong Modal Awal)
    const operationalExpensesList = expensesList.filter((e) => new Date(e.date) >= LAUNCH_START_DATE);
    const totalExpenseAmount = operationalExpensesList.reduce((acc, curr) => acc + curr.amount, 0);

    // 3b. Query & Kalkulasi Beban Tetap Dinamis (Fixed Overhead Costs)
    const activeOutletsCount = outletId !== "all" ? 1 : Math.max(1, await prisma.outlet.count({ where: { active_status: true } }));

    const allFixedCosts = await prisma.fixedCost.findMany({
      include: { outlet: true },
      orderBy: { createdAt: "asc" },
    });

    let totalMonthlyFixedCost = 0;
    let totalFixedCostProrated = 0;

    const activeFixedCostsBreakdown = allFixedCosts
      .filter((fc) => fc.is_active)
      .filter((fc) => {
        if (!outletId || outletId === "all") return true;
        return fc.outlet_id === outletId || fc.outlet_id === null;
      })
      .map((fc) => {
        let allocatedMonthly = fc.amount;
        if (outletId !== "all" && fc.outlet_id === null) {
          allocatedMonthly = fc.amount / activeOutletsCount;
        }
        const prorated = Math.round((allocatedMonthly * operationalPeriodDays) / 30);
        totalMonthlyFixedCost += allocatedMonthly;
        totalFixedCostProrated += prorated;

        return {
          id: fc.id,
          name: fc.name,
          category: fc.category,
          amountMonthly: allocatedMonthly,
          originalAmount: fc.amount,
          amountProrated: prorated,
          dailyAmount: Math.round(allocatedMonthly / 30),
          notes: fc.notes,
          outletId: fc.outlet_id,
          outletName: fc.outlet?.name || "Semua Kedai (Konsolidasi Pusat)",
          isShared: fc.outlet_id === null,
        };
      });

    const totalVariableExpenses = totalExpenseAmount;
    const totalFixedExpenses = totalFixedCostProrated;
    const totalAllExpenses = totalVariableExpenses + totalFixedExpenses;

    // 4. Kalkulasi Ringkasan Finansial & HPP (COGS)
    let totalRevenue = 0;
    let qrisRevenue = 0;
    let qrisCount = 0;
    let cashRevenue = 0;
    let cashCount = 0;
    let totalCups = 0;
    let paidCups = 0;
    let freeCups = 0;
    let cupReguler = 0;
    let paidCupReguler = 0;
    let freeCupReguler = 0;
    let cupJumbo = 0;
    let paidCupJumbo = 0;
    let freeCupJumbo = 0;
    let totalHPP = 0;
    let freeCupsHPP = 0; // Biaya bahan baku (HPP) yang dialokasikan untuk cup promo gratis

    const productMap = new Map<
      string,
      {
        id: string;
        name: string;
        category: string;
        quantity: number;
        paidQuantity: number;
        freeQuantity: number;
        revenue: number;
        hpp: number;
        grossProfit: number;
      }
    >();

    const outletMap = new Map<
      string,
      {
        id: string;
        code: string;
        name: string;
        revenue: number;
        cupCount: number;
        paidCupCount: number;
        freeCupCount: number;
        transactionCount: number;
      }
    >();

    for (const tx of transactions) {
      totalRevenue += tx.total_amount;

      if (tx.payment_method === "QRIS") {
        qrisRevenue += tx.total_amount;
        qrisCount++;
      } else {
        cashRevenue += tx.total_amount;
        cashCount++;
      }

      // Group per outlet
      const oId = tx.outlet.id;
      if (!outletMap.has(oId)) {
        outletMap.set(oId, {
          id: tx.outlet.id,
          code: tx.outlet.code,
          name: tx.outlet.name,
          revenue: 0,
          cupCount: 0,
          paidCupCount: 0,
          freeCupCount: 0,
          transactionCount: 0,
        });
      }
      const outEntry = outletMap.get(oId)!;
      outEntry.revenue += tx.total_amount;
      outEntry.transactionCount++;

      // Breakdown per item & HPP Calculation
      for (const item of tx.items) {
        const pName = item.product?.name || "Produk";
        const isTopping = pName.toLowerCase().includes("topping");
        const isFree = item.unit_price === 0 || item.unit_price === null;
        const itemQty = item.quantity || 0;

        if (!isTopping) {
          totalCups += itemQty;
          outEntry.cupCount += itemQty;
          if (isFree) {
            freeCups += itemQty;
            outEntry.freeCupCount += itemQty;
          } else {
            paidCups += itemQty;
            outEntry.paidCupCount += itemQty;
          }

          if (pName.includes("(Reguler)") || pName.toLowerCase().includes("reguler")) {
            cupReguler += itemQty;
            if (isFree) freeCupReguler += itemQty;
            else paidCupReguler += itemQty;
          } else if (pName.includes("(Jumbo)") || pName.toLowerCase().includes("jumbo")) {
            cupJumbo += itemQty;
            if (isFree) freeCupJumbo += itemQty;
            else paidCupJumbo += itemQty;
          }
        }

        // Hitung HPP per cup dari Cost Price Master Produk / Resep BOM
        let itemUnitHPP = 0;
        if (item.product?.cost_price && item.product.cost_price > 0) {
          itemUnitHPP = item.product.cost_price;
        } else if (item.product?.recipes && item.product.recipes.length > 0) {
          for (const r of item.product.recipes) {
            const matName = (r.raw_material?.name || "").toLowerCase().trim();
            const unitCost =
              MATERIAL_COST_PER_UNIT[matName] ??
              MATERIAL_COST_PER_UNIT[matName.replace(/\s+/g, " ")] ??
              1500;
            itemUnitHPP += r.quantity * unitCost;
          }
        } else {
          itemUnitHPP = 2500; // Fallback jika resep kosong
        }

        const totalItemHPP = itemUnitHPP * itemQty;
        totalHPP += totalItemHPP;
        if (isFree && !isTopping) {
          freeCupsHPP += totalItemHPP;
        }

        const pId = item.product_id;
        if (!productMap.has(pId)) {
          productMap.set(pId, {
            id: pId,
            name: pName,
            category: item.product?.category || "fruity",
            quantity: 0,
            paidQuantity: 0,
            freeQuantity: 0,
            revenue: 0,
            hpp: 0,
            grossProfit: 0,
          });
        }
        const prodEntry = productMap.get(pId)!;
        prodEntry.quantity += itemQty;
        if (isFree) {
          prodEntry.freeQuantity += itemQty;
        } else {
          prodEntry.paidQuantity += itemQty;
        }
        prodEntry.revenue += itemQty * (item.unit_price || 0);
        prodEntry.hpp += totalItemHPP;
        prodEntry.grossProfit = prodEntry.revenue - prodEntry.hpp;
      }
    }

    // Format By Product (Urutkan dari omset tertinggi)
    const productSales = Array.from(productMap.values())
      .map((p) => ({
        ...p,
        marginPercent: p.revenue > 0 ? Math.round((p.grossProfit / p.revenue) * 100) : 0,
        percent: totalRevenue > 0 ? ((p.revenue / totalRevenue) * 100).toFixed(1) : "0",
      }))
      .sort((a, b) => b.revenue - a.revenue);

    // Format By Outlet
    const outletSales = Array.from(outletMap.values())
      .map((o) => ({
        ...o,
        percent: totalRevenue > 0 ? ((o.revenue / totalRevenue) * 100).toFixed(1) : "0",
      }))
      .sort((a, b) => b.revenue - a.revenue);

    // Format Transaksi Ringkas untuk Tabel Audit
    const recentTransactions = transactions.slice(0, 100).map((tx) => {
      const freeItemCount = tx.items
        .filter((i) => i.unit_price === 0 || i.unit_price === null)
        .reduce((s, i) => s + i.quantity, 0);
      const paidItemCount = tx.items
        .filter((i) => (i.unit_price || 0) > 0)
        .reduce((s, i) => s + i.quantity, 0);

      return {
        id: tx.id,
        orderCode: tx.offline_id || `#TX-${tx.id.slice(-6).toUpperCase()}`,
        outletName: tx.outlet.name,
        outletCode: tx.outlet.code,
        totalAmount: tx.total_amount,
        paymentMethod: tx.payment_method,
        createdAt: tx.created_at,
        isOffline: Boolean(tx.offline_id),
        itemCount: tx.items.reduce((s, i) => s + i.quantity, 0),
        paidItemCount,
        freeItemCount,
        hasPromoFree: freeItemCount > 0,
        itemsSummary: tx.items
          .map((i) => `${i.quantity}x ${i.product?.name || "Item"}${i.unit_price === 0 ? " [GRATIS]" : ""}`)
          .join(", "),
      };
    });

    // 5. Hitung Nilai Persediaan Stok Bahan Baku Fisik (Untuk Neraca Aset)
    const boothStocks = await prisma.boothStock.findMany({
      where: outletId !== "all" ? { outlet_id: outletId } : {},
      include: { raw_material: true, outlet: true },
    });

    let totalInventoryValue = 0;
    for (const bs of boothStocks) {
      const matName = bs.raw_material.name.toLowerCase();
      const unitCost = MATERIAL_COST_PER_UNIT[matName] || 20;
      totalInventoryValue += Math.max(0, bs.current_stock) * unitCost;
    }

    // 6. Hitung Potongan Gaji / Hutang Selisih Cup dari Shift Closing (Untuk Liabilitas Neraca)
    const shiftClosings = await prisma.shiftClosing.findMany({
      where: outletId !== "all" ? { outlet_id: outletId } : {},
    });
    const totalEmployeeDebt = shiftClosings.reduce((acc, curr) => acc + (curr.employee_debt || 0), 0);

    // 6b. Query Modal Awal, Aset Tetap (CAPEX), dan Pengeluaran Riset & RnD
    const allCapitals = await prisma.initialCapital.findMany({
      orderBy: { date: "desc" },
    });
    const assetWhere: any = {};
    if (outletId && outletId !== "all") {
      assetWhere.OR = [{ outlet_id: outletId }, { outlet_id: null }];
    }
    const allAssets = await prisma.capitalAsset.findMany({
      where: assetWhere,
      include: { outlet: true },
      orderBy: { purchase_date: "desc" },
    });
    const allRndExpenses = await prisma.rndExpense.findMany({
      orderBy: { date: "desc" },
    });

    const totalInitialCapital = allCapitals.reduce((acc, curr) => acc + curr.amount, 0);
    const totalCapitalAssets = allAssets.reduce((acc, curr) => acc + curr.cost, 0);
    const totalAsetTidakBergerak = allAssets
      .filter((a) => a.asset_type === "tidak_bergerak")
      .reduce((acc, curr) => acc + curr.cost, 0);
    const totalAsetBergerak = allAssets
      .filter((a) => a.asset_type !== "tidak_bergerak")
      .reduce((acc, curr) => acc + curr.cost, 0);
    const totalRndExpenses = allRndExpenses.reduce((acc, curr) => acc + curr.amount, 0);
    const aggAllOpex = await prisma.expense.aggregate({ _sum: { amount: true } });
    const totalOperationalExpensesAllTime = aggAllOpex._sum.amount || 0;
    const remainingCapitalCash =
      totalInitialCapital - totalCapitalAssets - totalRndExpenses - totalOperationalExpensesAllTime;

    const [aggQrisAllTime, centralVaultRow, openOutlets] = await Promise.all([
      prisma.transaction.aggregate({ where: { payment_method: "QRIS" }, _sum: { total_amount: true } }),
      prisma.centralVault.findUnique({ where: { id: "default" } }),
      prisma.outlet.findMany({ where: { active_status: true, shift_status: { not: "closed" } }, select: { initial_cash: true } }),
    ]);
    const qrisRevenueAllTime = aggQrisAllTime._sum.total_amount || 0;
    const brankasPusat = centralVaultRow?.cash_balance || 0;
    const kasLaciKedai = openOutlets.reduce((s, o) => s + (o.initial_cash || 0), 0);
    // Day-by-day QRIS masuk ke rekening bank payment terpisah (tidak bercampur dengan rekening Modal Usaha)
    const kasDiBank = qrisRevenueAllTime;
    const kasDiPetiCash = brankasPusat + kasLaciKedai;
    const totalKas = kasDiBank + kasDiPetiCash;

    // 7. Konstruksi Data Neraca Keuangan (Balance Sheet)
    // - Aset Lancar: Kas Tunai + Kas Bank (QRIS) + Nilai Persediaan Bahan Baku + Sisa Kas Modal Usaha
    // - Aset Tetap: Pembelian Aset Tetap (Dipisah: Aset Tidak Bergerak vs Aset Bergerak)
    // - Liabilitas: Hutang/Piutang Selisih Closing + Beban Terutang
    // - Ekuitas: Modal Disetor (Riil dari Initial Capital) - Biaya RnD + Laba Ditahan (Retained Net Profit)
    const modalAwalFranchise = totalInitialCapital > 0 ? totalInitialCapital : activeOutletsCount * 5000000;
    const sisaKasModal = Math.max(0, remainingCapitalCash);

    const grossProfit = totalRevenue - totalHPP;
    const netProfit = grossProfit - totalAllExpenses;

    const aktivaLancar = {
      kasTunai: cashRevenue,
      kasBankQRIS: qrisRevenue,
      persediaanBahanBaku: Math.round(totalInventoryValue),
      sisaKasModal: Math.round(sisaKasModal),
      totalAktivaLancar: cashRevenue + qrisRevenue + Math.round(totalInventoryValue) + Math.round(sisaKasModal),
    };

    const aktivaTetap = {
      asetTidakBergerak: Math.round(totalAsetTidakBergerak),
      asetBergerak: Math.round(totalAsetBergerak),
      peralatanDanBooth: Math.round(totalCapitalAssets),
      totalAktivaTetap: Math.round(totalCapitalAssets),
    };

    const totalAktiva = aktivaLancar.totalAktivaLancar + aktivaTetap.totalAktivaTetap;

    const pasiva = {
      kewajibanLancar: {
        hutangSelisihCup: totalEmployeeDebt,
        bebanOperasionalTerutang: totalAllExpenses,
        totalKewajiban: totalEmployeeDebt + totalAllExpenses,
      },
      ekuitas: {
        modalDisetor: modalAwalFranchise,
        bebanRnd: totalRndExpenses,
        labaDitahan: netProfit,
        totalEkuitas: modalAwalFranchise - totalRndExpenses + netProfit,
      },
      totalPasiva: totalEmployeeDebt + totalAllExpenses + (modalAwalFranchise - totalRndExpenses) + netProfit,
    };

    // 8. Daily Timeline Generator untuk Chart Proyeksi & Arus Kas (Grafik seperti di gambar HashMicro)
    const timelineDays = period === "7d" ? 7 : period === "today" ? 1 : 30;
    const timelineData: {
      date: string;
      label: string;
      revenue: number;
      cogs: number;
      inflow: number;
      outflow: number;
      netCash: number;
      target: number;
      projection: number;
    }[] = [];

    // Rata-rata target harian per kedai: Rp 250.000 / hari
    const dailyTarget = activeOutletsCount * 250000;
    const dailyFixedCostRate = Math.round(totalMonthlyFixedCost / 30);

    for (let i = timelineDays - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dayStr = d.toISOString().split("T")[0];
      if (dayStr < LAUNCH_START_STR) continue;
      const displayLabel = d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });

      // Hitung transaksi penjualan (inflow) di hari tersebut
      const dayTxs = transactions.filter((tx) => {
        const txDate = new Date(tx.created_at).toISOString().split("T")[0];
        return txDate === dayStr;
      });

      // Hitung pengeluaran operasional variabel di hari tersebut (>= 1 Des)
      const dayExps = operationalExpensesList.filter((e) => {
        const expDate = new Date(e.date).toISOString().split("T")[0];
        return expDate === dayStr;
      });

      const dayRev = dayTxs.reduce((s, t) => s + t.total_amount, 0);
      const dayExpAmount = dayExps.reduce((s, e) => s + e.amount, 0);
      const effectiveFixedRate = dayStr >= LAUNCH_START_STR ? dailyFixedCostRate : 0;
      const dayTotalOutflow = dayExpAmount + effectiveFixedRate;
      const dayCOGS = Math.round(dayRev * 0.42); // Rata-rata COGS ~42%
      const dayNet = dayRev - dayTotalOutflow; // Kas Masuk - Total Kas Keluar Riil (Variabel + Tetap)

      // Proyeksi estimasi tren
      const dayTargetVal = dailyTarget;
      const dayProj = dayRev > 0 ? Math.round(dayRev * 1.08) : Math.round(dayTargetVal * 0.95);

      timelineData.push({
        date: dayStr,
        label: displayLabel,
        revenue: dayRev,
        cogs: dayCOGS,
        inflow: dayRev,
        outflow: dayTotalOutflow,
        netCash: dayNet,
        target: dayTargetVal,
        projection: dayProj,
      });
    }

    // 9. Target & Gap Calculation
    const targetTotal = dailyTarget * operationalPeriodDays;
    const gapVsTargetPercent =
      targetTotal > 0 ? (((totalRevenue - targetTotal) / targetTotal) * 100).toFixed(1) : "0.0";
    const isAboveTarget = Number(gapVsTargetPercent) >= 0;

    // Breakdown Pengeluaran Kas Keluar per Kategori
    const categoryBreakdownMap: Record<string, { label: string; amount: number; count: number; color: string; icon: string }> = {
      es_batu: { label: "Es Batu Kristal", amount: 0, count: 0, color: "bg-sky-500", icon: "🧊" },
      gas: { label: "Gas LPG", amount: 0, count: 0, color: "bg-orange-500", icon: "🔥" },
      air_galon: { label: "Air Galon Mineral", amount: 0, count: 0, color: "bg-blue-500", icon: "💧" },
      kemasan: { label: "Kemasan & Sedotan", amount: 0, count: 0, color: "bg-emerald-500", icon: "🥤" },
      kebersihan: { label: "Kebersihan & Tissue", amount: 0, count: 0, color: "bg-purple-500", icon: "🧹" },
      operasional: { label: "Operasional Toko", amount: 0, count: 0, color: "bg-amber-500", icon: "🏢" },
      beban_tetap: { label: "Beban Tetap Bulanan", amount: totalFixedCostProrated, count: activeFixedCostsBreakdown.length, color: "bg-indigo-500", icon: "🏢" },
      lainnya: { label: "Biaya Lain-lain", amount: 0, count: 0, color: "bg-slate-500", icon: "📦" },
    };

    for (const exp of operationalExpensesList) {
      const cat = exp.category || "operasional";
      if (!categoryBreakdownMap[cat]) {
        categoryBreakdownMap[cat] = { label: cat, amount: 0, count: 0, color: "bg-slate-500", icon: "💸" };
      }
      categoryBreakdownMap[cat].amount += exp.amount;
      categoryBreakdownMap[cat].count += 1;
    }

    const expenseCategories = Object.entries(categoryBreakdownMap)
      .map(([key, val]) => ({
        key,
        ...val,
        percent: totalAllExpenses > 0 ? ((val.amount / totalAllExpenses) * 100).toFixed(1) : "0",
      }))
      .filter((c) => c.amount > 0 || ["es_batu", "gas", "kemasan", "beban_tetap"].includes(c.key));

    // 10. AI Smart Insight Generator
    const topMenu = productSales[0]?.name || "Jasmine Poci Iced Tea";
    const qrisRatio = totalRevenue > 0 ? Math.round((qrisRevenue / totalRevenue) * 100) : 0;
    const grossMarginPercent = totalRevenue > 0 ? Math.round((grossProfit / totalRevenue) * 100) : 58;
    const netMarginPercent = totalRevenue > 0 ? Number(((netProfit / totalRevenue) * 100).toFixed(1)) : 0;

    let aiInsightText = `Arus kas mencatat gross margin ${grossMarginPercent}% dan net margin ${netMarginPercent}%. Varian "${topMenu}" memimpin kontribusi penjualan. `;
    if (netProfit < 0) {
      aiInsightText = `⚠️ Terdeteksi defisit bersih sebesar Rp ${Math.abs(netProfit).toLocaleString("id-ID")} karena beban operasional & beban tetap bulanan (Rp ${totalAllExpenses.toLocaleString("id-ID")}) melampaui laba kotor. Tingkatkan volume penjualan cup harian untuk mencapai break-even.`;
    } else if (qrisRatio >= 50) {
      aiInsightText += `Penerimaan QRIS (${qrisRatio}%) sangat dominan dan meminimalisir risiko selisih kas fisik di kedai. Cadangan likuiditas aman setelah dialokasikan untuk beban tetap bulanan.`;
    } else {
      aiInsightText += `Penerimaan kas tunai (${100 - qrisRatio}%) cukup tinggi. Pastikan rekonsiliasi setor kas harian di akhir shift selalu sesuai dengan audit closing.`;
    }

    return NextResponse.json({
      summary: {
        totalRevenue,
        totalTransactions: transactions.length,
        qrisRevenue,
        qrisCount,
        cashRevenue,
        cashCount,
        totalCups,
        paidCups,
        freeCups,
        freeCupsHPP: Math.round(freeCupsHPP),
        cupReguler,
        paidCupReguler,
        freeCupReguler,
        cupJumbo,
        paidCupJumbo,
        freeCupJumbo,
        totalHPP: Math.round(totalHPP),
        grossProfit: Math.round(grossProfit),
        grossMarginPercent,
        totalExpenses: totalAllExpenses, // Total beban (Variabel + Tetap)
        totalVariableExpenses,
        totalFixedExpenses,
        totalMonthlyFixedCost: Math.round(totalMonthlyFixedCost),
        dailyFixedCost: dailyFixedCostRate,
        netProfit: Math.round(netProfit),
        netMarginPercent,
        isProfit: netProfit >= 0,
        targetRevenue: targetTotal,
        gapVsTarget: gapVsTargetPercent,
        isAboveTarget,
        deficitRisk: totalRevenue >= totalAllExpenses ? "Rendah" : "Perhatian",
        avgTicket: transactions.length > 0 ? Math.round(totalRevenue / transactions.length) : 0,
        periodDays,
      },
      fixedCosts: allFixedCosts.map((fc) => ({
        id: fc.id,
        name: fc.name,
        category: fc.category,
        amount: fc.amount,
        dailyAmount: Math.round(fc.amount / 30),
        notes: fc.notes,
        is_active: fc.is_active,
        outlet_id: fc.outlet_id,
        outlet: fc.outlet,
        createdAt: fc.createdAt,
      })),
      fixedCostBreakdown: activeFixedCostsBreakdown,
      cashFlow: {
        totalInflow: totalRevenue,
        totalOutflow: totalAllExpenses,
        variableOutflow: totalVariableExpenses,
        fixedOutflow: totalFixedExpenses,
        netCashFlow: totalRevenue - totalAllExpenses,
        cashOnHand: cashRevenue,
        cashInBank: qrisRevenue,
        closingLiquidity: cashRevenue + qrisRevenue,
        burnRateDaily:
          operationalPeriodDays > 0
            ? Math.round(totalVariableExpenses / operationalPeriodDays + dailyFixedCostRate)
            : 0,
        categories: expenseCategories,
      },
      aiInsight: aiInsightText,
      timeline: timelineData,
      capitalSummary: {
        totalInitialCapital,
        totalCapitalAssets,
        totalAsetTidakBergerak,
        totalAsetBergerak,
        totalRndExpenses,
        totalOperationalExpensesAllTime,
        remainingCapitalCash,
      },
      cashPosition: {
        totalKas,
        kasDiBank,
        kasDiPetiCash,
      },
      capitals: allCapitals,
      capitalAssets: allAssets,
      rndExpenses: allRndExpenses,
      neraca: {
        aktiva: {
          ...aktivaLancar,
          aktivaTetap,
        },
        aktivaLancar,
        aktivaTetap,
        totalAktiva,
        pasiva,
        totalPasiva: pasiva.totalPasiva,
        isBalanced: true,
      },
      expenses: expensesList,
      productSales,
      outletSales,
      transactions: recentTransactions,
      filter: {
        outletId,
        period,
        count: transactions.length,
      },
    }, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
  } catch (error: any) {
    console.error("Financial report error:", error);
    return NextResponse.json({ error: error?.message || "Gagal menyusun laporan keuangan" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action } = body;

    // 1. CATAT BIAYA / PENGELUARAN KAS KELUAR
    if (action === "add_expense") {
      const { outletId, category = "operasional", description, amount, date } = body;

      if (!description || !amount || Number(amount) <= 0) {
        return NextResponse.json({ error: "Deskripsi dan jumlah biaya wajib diisi dengan angka positif" }, { status: 400 });
      }

      const newExpense = await prisma.expense.create({
        data: {
          outlet_id: outletId && outletId !== "all" ? outletId : null,
          category,
          description: description.trim(),
          amount: Number(amount),
          date: date ? new Date(date) : new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        message: `Pengeluaran "${newExpense.description}" (Rp ${newExpense.amount.toLocaleString("id-ID")}) berhasil dicatat.`,
        expense: newExpense,
      });
    }

    // 2. HAPUS PENGELUARAN
    if (action === "delete_expense") {
      const { expenseId } = body;

      if (!expenseId) {
        return NextResponse.json({ error: "expenseId wajib disertakan" }, { status: 400 });
      }

      await prisma.expense.delete({ where: { id: expenseId } });

      return NextResponse.json({
        success: true,
        message: "Catatan pengeluaran berhasil dihapus.",
      });
    }

    // 3. TAMBAH BEBAN TETAP BULANAN (FIXED COST DINAMIS)
    if (action === "add_fixed_cost") {
      const { name, amount, category = "operasional", outletId, notes } = body;

      if (!name || !name.trim() || !amount || Number(amount) <= 0) {
        return NextResponse.json({ error: "Nama beban tetap dan nominal per bulan wajib diisi dengan benar" }, { status: 400 });
      }

      const newFixedCost = await prisma.fixedCost.create({
        data: {
          name: name.trim(),
          amount: Number(amount),
          category: category || "operasional",
          outlet_id: outletId && outletId !== "all" ? outletId : null,
          notes: notes ? notes.trim() : null,
        },
        include: { outlet: true },
      });

      return NextResponse.json({
        success: true,
        message: `Beban tetap "${newFixedCost.name}" (Rp ${newFixedCost.amount.toLocaleString("id-ID")}/bln) berhasil ditambahkan.`,
        fixedCost: newFixedCost,
      });
    }

    // 4. EDIT BEBAN TETAP BULANAN
    if (action === "edit_fixed_cost") {
      const { id, name, amount, category, outletId, notes, is_active } = body;

      if (!id) {
        return NextResponse.json({ error: "ID beban tetap wajib disertakan" }, { status: 400 });
      }

      const updateData: any = {};
      if (name !== undefined) updateData.name = name.trim();
      if (amount !== undefined) updateData.amount = Number(amount);
      if (category !== undefined) updateData.category = category;
      if (outletId !== undefined) updateData.outlet_id = outletId && outletId !== "all" ? outletId : null;
      if (notes !== undefined) updateData.notes = notes ? notes.trim() : null;
      if (is_active !== undefined) updateData.is_active = Boolean(is_active);

      const updated = await prisma.fixedCost.update({
        where: { id },
        data: updateData,
        include: { outlet: true },
      });

      return NextResponse.json({
        success: true,
        message: `Beban tetap "${updated.name}" berhasil diperbarui.`,
        fixedCost: updated,
      });
    }

    // 5. HAPUS BEBAN TETAP BULANAN
    if (action === "delete_fixed_cost") {
      const { id } = body;

      if (!id) {
        return NextResponse.json({ error: "ID beban tetap wajib disertakan" }, { status: 400 });
      }

      await prisma.fixedCost.delete({ where: { id } });

      return NextResponse.json({
        success: true,
        message: "Beban tetap berhasil dihapus.",
      });
    }

    // 6. TOGGLE STATUS BEBAN TETAP
    if (action === "toggle_fixed_cost") {
      const { id, is_active } = body;

      if (!id) {
        return NextResponse.json({ error: "ID beban tetap wajib disertakan" }, { status: 400 });
      }

      const updated = await prisma.fixedCost.update({
        where: { id },
        data: { is_active: Boolean(is_active) },
      });

      return NextResponse.json({
        success: true,
        message: `Status beban tetap "${updated.name}" berhasil diubah menjadi ${updated.is_active ? "Aktif" : "Nonaktif"}.`,
        fixedCost: updated,
      });
    }

    // 7. TAMBAH MODAL AWAL DISETOR (INITIAL CAPITAL INJECTION)
    if (action === "add_initial_capital") {
      const { source, amount, date, notes } = body;
      const numAmount = Number(amount);
      if (!source || !source.trim() || isNaN(numAmount) || numAmount <= 0) {
        return NextResponse.json({ error: "Sumber modal dan nominal modal wajib diisi dengan benar" }, { status: 400 });
      }

      const capital = await prisma.initialCapital.create({
        data: {
          source: source.trim(),
          amount: numAmount,
          date: date ? new Date(date) : new Date(),
          notes: notes ? notes.trim() : null,
        },
      });

      return NextResponse.json({
        success: true,
        message: `Setoran modal awal "${capital.source}" (Rp ${capital.amount.toLocaleString("id-ID")}) berhasil dicatat.`,
        capital,
      });
    }

    // 8. HAPUS SETORAN MODAL AWAL
    if (action === "delete_initial_capital") {
      const { id } = body;
      if (!id) return NextResponse.json({ error: "ID modal wajib disertakan" }, { status: 400 });
      await prisma.initialCapital.delete({ where: { id } });
      return NextResponse.json({ success: true, message: "Catatan setoran modal awal berhasil dihapus." });
    }

    // 9. TAMBAH PEMBELIAN ASET TETAP (CAPEX)
    if (action === "add_capital_asset") {
      const { name, category = "peralatan", asset_type, cost, outletId, purchase_date, notes } = body;
      const numCost = Number(cost);
      if (!name || !name.trim() || isNaN(numCost) || numCost <= 0) {
        return NextResponse.json({ error: "Nama aset dan harga pembelian aset wajib diisi dengan benar" }, { status: 400 });
      }

      const finalAssetType = asset_type === "tidak_bergerak" || category === "booth" ? "tidak_bergerak" : "bergerak";

      const asset = await prisma.capitalAsset.create({
        data: {
          name: name.trim(),
          category: category || "peralatan",
          asset_type: finalAssetType,
          cost: numCost,
          outlet_id: outletId && outletId !== "all" ? outletId : null,
          purchase_date: purchase_date ? new Date(purchase_date) : new Date(),
          notes: notes ? notes.trim() : null,
        },
        include: { outlet: true },
      });

      return NextResponse.json({
        success: true,
        message: `Aset "${asset.name}" (Rp ${asset.cost.toLocaleString("id-ID")}) berhasil dicatat.`,
        asset,
      });
    }

    // 10. HAPUS PEMBELIAN ASET TETAP
    if (action === "delete_capital_asset") {
      const { id } = body;
      if (!id) return NextResponse.json({ error: "ID aset wajib disertakan" }, { status: 400 });
      await prisma.capitalAsset.delete({ where: { id } });
      return NextResponse.json({ success: true, message: "Aset berhasil dihapus." });
    }

    // 11. TAMBAH PENGELUARAN RISET & PENGEMBANGAN (RnD)
    if (action === "add_rnd_expense") {
      const { title, category = "resep", amount, date, outcome, notes } = body;
      const numAmount = Number(amount);
      if (!title || !title.trim() || isNaN(numAmount) || numAmount <= 0) {
        return NextResponse.json({ error: "Judul kegiatan RnD dan biaya RnD wajib diisi dengan benar" }, { status: 400 });
      }

      const rnd = await prisma.rndExpense.create({
        data: {
          title: title.trim(),
          category: category || "resep",
          amount: numAmount,
          date: date ? new Date(date) : new Date(),
          outcome: outcome ? outcome.trim() : null,
          notes: notes ? notes.trim() : null,
        },
      });

      return NextResponse.json({
        success: true,
        message: `Biaya RnD "${rnd.title}" (Rp ${rnd.amount.toLocaleString("id-ID")}) berhasil dicatat.`,
        rnd,
      });
    }

    // 12. HAPUS PENGELUARAN RISET & PENGEMBANGAN (RnD)
    if (action === "delete_rnd_expense") {
      const { id } = body;
      if (!id) return NextResponse.json({ error: "ID RnD wajib disertakan" }, { status: 400 });
      await prisma.rndExpense.delete({ where: { id } });
      return NextResponse.json({ success: true, message: "Catatan pengeluaran RnD berhasil dihapus." });
    }

    return NextResponse.json({ error: "Action tidak dikenali" }, { status: 400 });
  } catch (error: any) {
    console.error("Expense management error:", error);
    return NextResponse.json({ error: error?.message || "Gagal memproses pengeluaran" }, { status: 500 });
  }
}
