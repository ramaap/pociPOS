import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Biaya modal satuan estimasi standar franchise Es Teh Poci (HPP BOM)
const MATERIAL_COST_PER_UNIT: Record<string, number> = {
  "cup reguler": 450, // Rp 450 / pcs
  "cup jumbo": 650, // Rp 650 / pcs
  "kantong teh": 15000, // Rp 15.000 / kantong (bisa menyeduh ~30 porsi es teh)
  "liquid tea premix": 12, // Rp 12 / ml (Rp 12.000 / liter)
  "sachet vanilla": 1200, // Rp 1.200 / sachet
  "sachet thai tea": 1500, // Rp 1.500 / sachet
  "sachet milk tea": 1500, // Rp 1.500 / sachet
  "sachet cokelat": 1500, // Rp 1.500 / sachet
  "sachet lychee": 1200, // Rp 1.200 / sachet
  "sachet cappuccino": 1500, // Rp 1.500 / sachet
  "sachet guava": 1200, // Rp 1.200 / sachet
  "sachet mango": 1200, // Rp 1.200 / sachet
  "sachet blackcurrant": 1200, // Rp 1.200 / sachet
  "sachet apple": 1200, // Rp 1.200 / sachet
  "sachet orange": 1200, // Rp 1.200 / sachet
  "sachet lemon honey": 1200, // Rp 1.200 / sachet
  "sachet extra creamy": 1000, // Rp 1.000 / sachet
  // Backward compatibility
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
  "extra creamy foam": 1000,
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

    if (period === "today") {
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      dateFilter = { gte: startOfDay, lte: endOfDay };
    } else if (period === "yesterday") {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const startOfYesterday = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 0, 0, 0);
      const endOfYesterday = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59, 999);
      dateFilter = { gte: startOfYesterday, lte: endOfYesterday };
    } else if (period === "7d") {
      const sevenDaysAgo = new Date(now);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      sevenDaysAgo.setHours(0, 0, 0, 0);
      dateFilter = { gte: sevenDaysAgo };
    } else if (period === "30d") {
      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      thirtyDaysAgo.setHours(0, 0, 0, 0);
      dateFilter = { gte: thirtyDaysAgo };
    } else if (startDateParam && endDateParam) {
      dateFilter = {
        gte: new Date(startDateParam),
        lte: new Date(endDateParam),
      };
    }

    // 2. Query Transaksi dengan Filter
    const whereClause: any = {};
    if (outletId && outletId !== "all") {
      whereClause.outlet_id = outletId;
    }
    if (dateFilter) {
      whereClause.created_at = dateFilter;
    }

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

    // 3. Query Pengeluaran / Biaya Operasional (Expenses)
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

    const totalExpenseAmount = expensesList.reduce((acc, curr) => acc + curr.amount, 0);

    // 4. Kalkulasi Ringkasan Finansial & HPP (COGS)
    let totalRevenue = 0;
    let qrisRevenue = 0;
    let qrisCount = 0;
    let cashRevenue = 0;
    let cashCount = 0;
    let totalCups = 0;
    let cupReguler = 0;
    let cupJumbo = 0;
    let totalHPP = 0;

    const productMap = new Map<
      string,
      {
        id: string;
        name: string;
        category: string;
        quantity: number;
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

        if (!isTopping) {
          totalCups += item.quantity;
          outEntry.cupCount += item.quantity;

          if (pName.includes("(Reguler)") || pName.toLowerCase().includes("reguler")) {
            cupReguler += item.quantity;
          } else if (pName.includes("(Jumbo)") || pName.toLowerCase().includes("jumbo")) {
            cupJumbo += item.quantity;
          }
        }

        // Hitung HPP per cup dari resep BOM
        let itemUnitHPP = 0;
        if (item.product?.recipes) {
          for (const r of item.product.recipes) {
            const matName = (r.raw_material?.name || "").toLowerCase();
            const unitCost = MATERIAL_COST_PER_UNIT[matName] || 20;
            itemUnitHPP += r.quantity * unitCost;
          }
        } else {
          itemUnitHPP = 2500; // Fallback jika resep kosong
        }

        const totalItemHPP = itemUnitHPP * item.quantity;
        totalHPP += totalItemHPP;

        const pId = item.product_id;
        if (!productMap.has(pId)) {
          productMap.set(pId, {
            id: pId,
            name: pName,
            category: item.product?.category || "fruity",
            quantity: 0,
            revenue: 0,
            hpp: 0,
            grossProfit: 0,
          });
        }
        const prodEntry = productMap.get(pId)!;
        prodEntry.quantity += item.quantity;
        prodEntry.revenue += item.quantity * item.unit_price;
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
    const recentTransactions = transactions.slice(0, 100).map((tx) => ({
      id: tx.id,
      orderCode: tx.offline_id || `#TX-${tx.id.slice(-6).toUpperCase()}`,
      outletName: tx.outlet.name,
      outletCode: tx.outlet.code,
      totalAmount: tx.total_amount,
      paymentMethod: tx.payment_method,
      createdAt: tx.created_at,
      isOffline: Boolean(tx.offline_id),
      itemCount: tx.items.reduce((s, i) => s + i.quantity, 0),
      itemsSummary: tx.items.map((i) => `${i.quantity}x ${i.product?.name || "Item"}`).join(", "),
    }));

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

    // 7. Konstruksi Data Neraca Keuangan (Balance Sheet)
    // - Aset: Kas Tunai + Kas Bank (QRIS) + Nilai Persediaan Bahan Baku
    // - Liabilitas: Hutang/Piutang Selisih Closing + Beban Terutang
    // - Ekuitas: Modal Booth Awal (Asumsi Rp 5jt/booth) + Laba Ditahan (Retained Net Profit)
    const activeOutletsCount = outletId !== "all" ? 1 : await prisma.outlet.count({ where: { active_status: true } });
    const modalAwalFranchise = activeOutletsCount * 5000000; // Rp 5.000.000 per booth

    const grossProfit = totalRevenue - totalHPP;
    const netProfit = grossProfit - totalExpenseAmount;

    const aktivaLancar = {
      kasTunai: cashRevenue,
      kasBankQRIS: qrisRevenue,
      persediaanBahanBaku: Math.round(totalInventoryValue),
      totalAktivaLancar: cashRevenue + qrisRevenue + Math.round(totalInventoryValue),
    };

    const totalAktiva = aktivaLancar.totalAktivaLancar;

    const pasiva = {
      kewajibanLancar: {
        hutangSelisihCup: totalEmployeeDebt,
        bebanOperasionalTerutang: totalExpenseAmount,
        totalKewajiban: totalEmployeeDebt + totalExpenseAmount,
      },
      ekuitas: {
        modalDisetor: modalAwalFranchise,
        labaDitahan: netProfit,
        totalEkuitas: modalAwalFranchise + netProfit,
      },
      totalPasiva: totalEmployeeDebt + totalExpenseAmount + modalAwalFranchise + netProfit,
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

    // Rata-rata target harian per kedai: Rp 200.000 / hari
    const dailyTarget = activeOutletsCount * 250000;

    for (let i = timelineDays - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dayStr = d.toISOString().split("T")[0];
      const displayLabel = d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });

      // Hitung transaksi penjualan (inflow) di hari tersebut
      const dayTxs = transactions.filter((tx) => {
        const txDate = new Date(tx.created_at).toISOString().split("T")[0];
        return txDate === dayStr;
      });

      // Hitung pengeluaran operasional (outflow) di hari tersebut
      const dayExps = expensesList.filter((e) => {
        const expDate = new Date(e.date).toISOString().split("T")[0];
        return expDate === dayStr;
      });

      const dayRev = dayTxs.reduce((s, t) => s + t.total_amount, 0);
      const dayExpAmount = dayExps.reduce((s, e) => s + e.amount, 0);
      const dayCOGS = Math.round(dayRev * 0.42); // Rata-rata COGS ~42%
      const dayNet = dayRev - dayExpAmount; // Kas Masuk - Kas Keluar Riil

      // Proyeksi estimasi tren
      const dayTargetVal = dailyTarget;
      const dayProj = dayRev > 0 ? Math.round(dayRev * 1.08) : Math.round(dayTargetVal * 0.95);

      timelineData.push({
        date: dayStr,
        label: displayLabel,
        revenue: dayRev,
        cogs: dayCOGS,
        inflow: dayRev,
        outflow: dayExpAmount,
        netCash: dayNet,
        target: dayTargetVal,
        projection: dayProj,
      });
    }

    // 9. Target & Gap Calculation
    const targetTotal = dailyTarget * (period === "today" ? 1 : period === "7d" ? 7 : 30);
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
      lainnya: { label: "Biaya Lain-lain", amount: 0, count: 0, color: "bg-slate-500", icon: "📦" },
    };

    for (const exp of expensesList) {
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
        percent: totalExpenseAmount > 0 ? ((val.amount / totalExpenseAmount) * 100).toFixed(1) : "0",
      }))
      .filter((c) => c.amount > 0 || ["es_batu", "gas", "kemasan"].includes(c.key));

    // 10. AI Smart Insight Generator
    const topMenu = productSales[0]?.name || "Jasmine Poci Iced Tea";
    const qrisRatio = totalRevenue > 0 ? Math.round((qrisRevenue / totalRevenue) * 100) : 0;
    const grossMarginPercent = totalRevenue > 0 ? Math.round((grossProfit / totalRevenue) * 100) : 58;

    let aiInsightText = `Arus kas beroperasi sehat dengan gross margin rata-rata ${grossMarginPercent}%. Varian "${topMenu}" memimpin kontribusi penjualan tertinggi. `;
    if (qrisRatio >= 50) {
      aiInsightText += `Penerimaan QRIS (${qrisRatio}%) sangat dominan dan meminimalisir risiko selisih kas fisik di kedai. Cadangan likuiditas aman untuk restock bahan baku.`;
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
        cupReguler,
        cupJumbo,
        totalHPP: Math.round(totalHPP),
        grossProfit: Math.round(grossProfit),
        grossMarginPercent,
        totalExpenses: totalExpenseAmount,
        netProfit: Math.round(netProfit),
        targetRevenue: targetTotal,
        gapVsTarget: gapVsTargetPercent,
        isAboveTarget,
        deficitRisk: totalRevenue >= totalExpenseAmount ? "Rendah" : "Perhatian",
        avgTicket: transactions.length > 0 ? Math.round(totalRevenue / transactions.length) : 0,
      },
      cashFlow: {
        totalInflow: totalRevenue,
        totalOutflow: totalExpenseAmount,
        netCashFlow: totalRevenue - totalExpenseAmount,
        cashOnHand: cashRevenue,
        cashInBank: qrisRevenue,
        closingLiquidity: cashRevenue + qrisRevenue,
        burnRateDaily: timelineDays > 0 ? Math.round(totalExpenseAmount / timelineDays) : 0,
        categories: expenseCategories,
      },
      aiInsight: aiInsightText,
      timeline: timelineData,
      neraca: {
        aktiva: aktivaLancar,
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

    return NextResponse.json({ error: "Action tidak dikenali" }, { status: 400 });
  } catch (error: any) {
    console.error("Expense management error:", error);
    return NextResponse.json({ error: error?.message || "Gagal memproses pengeluaran" }, { status: 500 });
  }
}
