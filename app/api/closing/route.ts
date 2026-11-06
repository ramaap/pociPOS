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
      actual_liquid_ml < 0
    ) {
      return NextResponse.json(
        { error: "Isian hitungan fisik tidak valid. Harus berupa angka 0 atau lebih." },
        { status: 400 }
      );
    }

    // 1. Ambil Stok Bahan Baku Aktual Sistem untuk Kedai Ini
    const boothStocks = await prisma.boothStock.findMany({
      where: {
        outlet_id,
        raw_material: {
          name: { in: ["Cup Reguler", "Cup Jumbo", "Liquid Tea Premix"] },
        },
      },
      include: { raw_material: true },
    });

    const cupRegStock = boothStocks.find((s) => s.raw_material.name === "Cup Reguler");
    const cupJumboStock = boothStocks.find((s) => s.raw_material.name === "Cup Jumbo");
    const liquidStock = boothStocks.find((s) => s.raw_material.name === "Liquid Tea Premix");

    const systemExpectedCupReg = cupRegStock ? Math.round(cupRegStock.current_stock) : 0;
    const systemExpectedCupJumbo = cupJumboStock ? Math.round(cupJumboStock.current_stock) : 0;
    const systemExpectedLiquid = liquidStock ? liquidStock.current_stock : 0;

    // 2. Ambil Harga Retail untuk Perhitungan Denda Kehilangan Cup
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

    // 3. Hitung Selisih (Fisik - Sistem)
    const discrepancyCupReg = actual_cup_reg - systemExpectedCupReg;
    const discrepancyCupJumbo = actual_cup_jumbo - systemExpectedCupJumbo;
    const totalDiscrepancyCup = discrepancyCupReg + discrepancyCupJumbo;
    const discrepancyLiquid = actual_liquid_ml - systemExpectedLiquid;

    // 4. Logika Flagging & Denda
    const missingRegCups = discrepancyCupReg < 0 ? Math.abs(discrepancyCupReg) : 0;
    const missingJumboCups = discrepancyCupJumbo < 0 ? Math.abs(discrepancyCupJumbo) : 0;
    const isTheftFlag = missingRegCups > 0 || missingJumboCups > 0;

    const liquidDeficit = systemExpectedLiquid - actual_liquid_ml;
    const isWasteFlag =
      systemExpectedLiquid > 0 &&
      liquidDeficit > 0 &&
      liquidDeficit / systemExpectedLiquid > 0.02;

    const employeeDebt =
      missingRegCups * regRetailPrice + missingJumboCups * jumboRetailPrice;

    // 5. Simpan Catatan Shift Closing Spesifik Outlet
    const closingRecord = await prisma.shiftClosing.create({
      data: {
        outlet_id,
        actual_cup_reg: Math.round(actual_cup_reg),
        actual_cup_jumbo: Math.round(actual_cup_jumbo),
        actual_liquid_ml: actual_liquid_ml,
        system_expected_cup_reg: systemExpectedCupReg,
        system_expected_cup_jumbo: systemExpectedCupJumbo,
        system_expected_liquid_ml: systemExpectedLiquid,
        discrepancy_cup: totalDiscrepancyCup,
        discrepancy_cup_reg: discrepancyCupReg,
        discrepancy_cup_jumbo: discrepancyCupJumbo,
        discrepancy_liquid: discrepancyLiquid,
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
