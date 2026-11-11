import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/vouchers?code=VCR-POC-XXXXX
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code")?.trim().toUpperCase();

    if (!code) {
      return NextResponse.json({ error: "Kode voucher wajib diisi." }, { status: 400 });
    }

    const voucher = await prisma.promoVoucher.findUnique({
      where: { code },
      include: { outlet: true },
    });

    if (!voucher) {
      return NextResponse.json(
        { valid: false, error: "Kode voucher tidak ditemukan dalam sistem." },
        { status: 404 }
      );
    }

    if (voucher.status === "redeemed") {
      const redeemedDate = voucher.redeemed_at
        ? new Date(voucher.redeemed_at).toLocaleString("id-ID")
        : "-";
      return NextResponse.json(
        {
          valid: false,
          error: `Voucher ini sudah pernah digunakan/ditukarkan pada ${redeemedDate}.`,
          voucher,
        },
        { status: 400 }
      );
    }

    const now = new Date();
    if (voucher.expires_at < now) {
      const expiredDate = new Date(voucher.expires_at).toLocaleDateString("id-ID");
      return NextResponse.json(
        {
          valid: false,
          error: `Masa berlaku voucher telah habis (Kedaluwarsa pada ${expiredDate}).`,
          voucher,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      valid: true,
      voucher: {
        code: voucher.code,
        productName: voucher.product_name,
        outletName: voucher.outlet.name,
        expiresAt: voucher.expires_at,
        status: voucher.status,
      },
    });
  } catch (error: any) {
    console.error("Error validating voucher:", error);
    return NextResponse.json(
      { error: "Gagal memverifikasi voucher: " + error.message },
      { status: 500 }
    );
  }
}

