import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const outlets = await prisma.outlet.findMany({
      where: { active_status: true },
      orderBy: { code: "asc" },
    });
    return NextResponse.json({ outlets });
  } catch (error) {
    return NextResponse.json({ error: "Gagal mengambil daftar outlet" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      outlet_id,
      actual_cup_reg,
      actual_cup_jumbo,
      actual_liquid_ml,
      actual_sugar_ml = 0,
      actual_cash = 0,
      notes = "",
    } = body;

    if (!outlet_id) {
      return NextResponse.json({ error: "Outlet ID wajib dipilih." }, { status: 400 });
    }

    if (
      typeof actual_cup_reg !== "number" ||
      typeof actual_cup_jumbo !== "number" ||
      typeof actual_liquid_ml !== "number" ||
      actual_cup_reg < 0 ||
      actual_cup_jumbo < 0 ||
      actual_liquid_ml < 0 ||
      (typeof actual_sugar_ml === "number" && actual_sugar_ml < 0) ||
      (typeof actual_cash === "number" && actual_cash < 0)
    ) {
      return NextResponse.json(
        { error: "Isian hitungan fisik tidak valid. Harus berupa angka 0 atau lebih." },
        { status: 400 }
      );
    }

    const sugarMl = typeof actual_sugar_ml === "number" ? actual_sugar_ml : 0;
    const cashActualNum = typeof actual_cash === "number" ? actual_cash : parseFloat(actual_cash) || 0;

    // 1. Ambil Stok Bahan Baku Aktual Sistem untuk Kedai Ini
    const boothStocks = await prisma.boothStock.findMany({
      where: {
        outlet_id,
        raw_material: {
          name: { in: ["Cup Reguler", "Cup Jumbo", "Liquid Tea Premix", "Kantong Teh", "Gula Cair"] },
        },
      },
      include: { raw_material: true },
    });

    const cupRegStock = boothStocks.find((s) => s.raw_material.name === "Cup Reguler");
    const cupJumboStock = boothStocks.find((s) => s.raw_material.name === "Cup Jumbo");
    const liquidStock = boothStocks.find((s) => s.raw_material.name === "Kantong Teh" || s.raw_material.name === "Liquid Tea Premix");
    const sugarStock = boothStocks.find((s) => s.raw_material.name.toLowerCase().includes("gula"));

    const systemExpectedCupReg = cupRegStock ? Math.round(cupRegStock.current_stock) : 0;
    const systemExpectedCupJumbo = cupJumboStock ? Math.round(cupJumboStock.current_stock) : 0;
    const systemExpectedLiquid = liquidStock ? liquidStock.current_stock : 0;
    const systemExpectedSugar = sugarStock ? sugarStock.current_stock : 0;

    // 2. Ambil Data Keuangan Shift untuk Validasi Ekspektasi Kas di Laci
    const targetOutlet = await prisma.outlet.findUnique({ where: { id: outlet_id } });
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const shiftStartTime = targetOutlet?.last_opened_at ? new Date(targetOutlet.last_opened_at) : todayStart;

    const cashTransactions = await prisma.transaction.findMany({
      where: {
        outlet_id,
        created_at: { gte: shiftStartTime },
        payment_method: { in: ["Cash", "cash", "tunai", "Tunai"] },
      },
      select: { total_amount: true },
    });
    const totalCashSales = cashTransactions.reduce((acc, curr) => acc + (curr.total_amount || 0), 0);

    const expenses = await prisma.expense.findMany({
      where: {
        outlet_id,
        date: { gte: shiftStartTime },
      },
      select: { amount: true },
    });
    const totalExpenses = expenses.reduce((acc, curr) => acc + (curr.amount || 0), 0);

    const initialCash = targetOutlet?.initial_cash || 0;
    const systemExpectedCash = initialCash + totalCashSales - totalExpenses;
    const discrepancyCash = cashActualNum - systemExpectedCash;

    // 3. Ambil Harga Retail untuk Perhitungan Denda Kehilangan Cup
    const regProduct = await prisma.product.findFirst({
      where: { name: { contains: "Reguler" } },
      orderBy: { price: "asc" },
    });
    const jumboProduct = await prisma.product.findFirst({
      where: { name: { contains: "Jumbo" } },
      orderBy: { price: "asc" },
    });

    const regRetailPrice = regProduct ? regProduct.price : 5000;
    const jumboRetailPrice = jumboProduct ? jumboProduct.price : 7000;

    // 4. Hitung Selisih (Fisik - Sistem)
    const discrepancyCupReg = actual_cup_reg - systemExpectedCupReg;
    const discrepancyCupJumbo = actual_cup_jumbo - systemExpectedCupJumbo;
    const totalDiscrepancyCup = discrepancyCupReg + discrepancyCupJumbo;
    const discrepancyLiquid = actual_liquid_ml - systemExpectedLiquid;
    const discrepancySugar = sugarMl - systemExpectedSugar;

    // 5. Logika Flagging & Denda
    const missingRegCups = discrepancyCupReg < 0 ? Math.abs(discrepancyCupReg) : 0;
    const missingJumboCups = discrepancyCupJumbo < 0 ? Math.abs(discrepancyCupJumbo) : 0;
    const isTheftFlag = missingRegCups > 0 || missingJumboCups > 0 || discrepancyCash < 0;

    const liquidDeficit = systemExpectedLiquid - actual_liquid_ml;
    const isWasteFlag =
      systemExpectedLiquid > 0 &&
      liquidDeficit > 0 &&
      liquidDeficit / systemExpectedLiquid > 0.02;

    const cupShortageDebt =
      missingRegCups * regRetailPrice + missingJumboCups * jumboRetailPrice;
    const cashShortageDebt = discrepancyCash < 0 ? Math.abs(discrepancyCash) : 0;
    const employeeDebt = cupShortageDebt + cashShortageDebt;

    // 6. Simpan Catatan Shift Closing Spesifik Outlet
    const closingRecord = await prisma.shiftClosing.create({
      data: {
        outlet_id,
        actual_cup_reg: Math.round(actual_cup_reg),
        actual_cup_jumbo: Math.round(actual_cup_jumbo),
        actual_liquid_ml: actual_liquid_ml,
        actual_sugar_ml: sugarMl,
        actual_cash: cashActualNum,
        system_expected_cup_reg: systemExpectedCupReg,
        system_expected_cup_jumbo: systemExpectedCupJumbo,
        system_expected_liquid_ml: systemExpectedLiquid,
        system_expected_sugar_ml: systemExpectedSugar,
        system_expected_cash: systemExpectedCash,
        discrepancy_cup: totalDiscrepancyCup,
        discrepancy_cup_reg: discrepancyCupReg,
        discrepancy_cup_jumbo: discrepancyCupJumbo,
        discrepancy_liquid: discrepancyLiquid,
        discrepancy_sugar_ml: discrepancySugar,
        discrepancy_cash: discrepancyCash,
        theft_flag: isTheftFlag,
        waste_flag: isWasteFlag,
        employee_debt: employeeDebt,
        notes: notes || null,
      },
    });

    // 6. Sinkronkan Stok Fisik Aktual ke BoothStock Kedai
    if (cupRegStock) {
      await prisma.boothStock.update({
        where: { id: cupRegStock.id },
        data: { current_stock: Math.round(actual_cup_reg) },
      });
    }
    if (cupJumboStock) {
      await prisma.boothStock.update({
        where: { id: cupJumboStock.id },
        data: { current_stock: Math.round(actual_cup_jumbo) },
      });
    }
    if (liquidStock) {
      await prisma.boothStock.update({
        where: { id: liquidStock.id },
        data: { current_stock: actual_liquid_ml },
      });
    }
    if (sugarStock) {
      await prisma.boothStock.update({
        where: { id: sugarStock.id },
        data: { current_stock: sugarMl },
      });
    }

    // 7. Tandai Shift Kedai Selesai Ditutup (Closed)
    await prisma.outlet.update({
      where: { id: outlet_id },
      data: {
        shift_status: "closed",
        last_closed_at: new Date(),
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Laporan Shift Closing berhasil dikirim ke server pusat.",
        shiftClosingId: closingRecord.id,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Closing API error:", error);
    return NextResponse.json(
      { error: "Gagal menyimpan data Shift Closing." },
      { status: 500 }
    );
  }
}
