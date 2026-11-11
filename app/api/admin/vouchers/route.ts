import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/admin/vouchers
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get("status") || "all";
    const outletFilter = searchParams.get("outletId") || "all";

    const whereClause: any = {};

    if (outletFilter !== "all") {
      whereClause.outlet = {
        OR: [{ id: outletFilter }, { code: outletFilter }],
      };
    }

    const now = new Date();

    // Ambil semua voucher sesuai outlet filter
    const allVouchers = await prisma.promoVoucher.findMany({
      where: whereClause,
      include: {
        outlet: {
          select: { id: true, name: true, code: true },
        },
      },
      orderBy: { created_at: "desc" },
    });

    // Otomatis tandai voucher yang sudah lewat tanggal kedaluwarsa tapi masih "active"
    const enrichedVouchers = allVouchers.map((v) => {
      const isExpired = v.status === "active" && new Date(v.expires_at) < now;
      const effectiveStatus = isExpired ? "expired" : v.status;
      return {
        ...v,
        effectiveStatus,
        isExpired,
      };
    });

    // Hitung ringkasan statistik
    const totalCount = enrichedVouchers.length;
    const activeCount = enrichedVouchers.filter((v) => v.effectiveStatus === "active").length;
    const redeemedCount = enrichedVouchers.filter((v) => v.effectiveStatus === "redeemed").length;
    const expiredCount = enrichedVouchers.filter((v) => v.effectiveStatus === "expired").length;

    // Terapkan status filter jika bukan "all"
    let filteredVouchers = enrichedVouchers;
    if (statusFilter !== "all") {
      filteredVouchers = enrichedVouchers.filter((v) => v.effectiveStatus === statusFilter);
    }

    return NextResponse.json({
      vouchers: filteredVouchers,
      stats: {
        total: totalCount,
        active: activeCount,
        redeemed: redeemedCount,
        expired: expiredCount,
      },
    });
  } catch (error: any) {
    console.error("Error fetching admin vouchers:", error);
    return NextResponse.json(
      { error: "Gagal memuat data voucher: " + error.message },
      { status: 500 }
    );
  }
}

// POST /api/admin/vouchers (Terbitkan Voucher Manual oleh Admin)
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { outletId, productName = "Jasmine Poci Iced Tea (Jumbo)", expiresInDays = 3, notes } = body;

    if (!outletId) {
      return NextResponse.json({ error: "Kedai / Outlet wajib dipilih." }, { status: 400 });
    }

    const currentOutlet = await prisma.outlet.findFirst({
      where: {
        OR: [{ id: outletId }, { code: outletId }],
      },
    });

    if (!currentOutlet) {
      return NextResponse.json({ error: "Kedai / Outlet tidak ditemukan." }, { status: 404 });
    }

    // Generate kode voucher unik 6 digit angka
    let code = `VCR-POC-${Math.floor(100000 + Math.random() * 900000)}`;
    let exists = await prisma.promoVoucher.findUnique({ where: { code } });
    while (exists) {
      code = `VCR-POC-${Math.floor(100000 + Math.random() * 900000)}`;
      exists = await prisma.promoVoucher.findUnique({ where: { code } });
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (Number(expiresInDays) || 3));

    const voucher = await prisma.promoVoucher.create({
      data: {
        code,
        outlet_id: currentOutlet.id,
        product_name: productName,
        status: "active",
        expires_at: expiresAt,
        notes: notes || "Diterbitkan manual dari Admin Dashboard",
      },
      include: {
        outlet: { select: { id: true, name: true, code: true } },
      },
    });

    return NextResponse.json({
      message: `Voucher ${code} berhasil diterbitkan.`,
      voucher,
    });
  } catch (error: any) {
    console.error("Error creating voucher:", error);
    return NextResponse.json(
      { error: "Gagal menerbitkan voucher: " + error.message },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/vouchers (Update Status Manual: e.g. Tandai Sudah Ditukar / Diaktifkan Kembali)
export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, status } = body;

    if (!id || !status) {
      return NextResponse.json({ error: "ID dan status voucher wajib diisi." }, { status: 400 });
    }

    const updateData: any = { status };
    if (status === "redeemed") {
      updateData.redeemed_at = new Date();
    } else if (status === "active") {
      updateData.redeemed_at = null;
      updateData.redeemed_tx_id = null;
    }

    const updated = await prisma.promoVoucher.update({
      where: { id },
      data: updateData,
      include: {
        outlet: { select: { id: true, name: true, code: true } },
      },
    });

    return NextResponse.json({
      message: `Status voucher ${updated.code} berhasil diubah menjadi ${status}.`,
      voucher: updated,
    });
  } catch (error: any) {
    console.error("Error updating voucher:", error);
    return NextResponse.json(
      { error: "Gagal memperbarui status voucher: " + error.message },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/vouchers (Hapus Voucher)
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID voucher wajib diisi." }, { status: 400 });
    }

    const deleted = await prisma.promoVoucher.delete({
      where: { id },
    });

    return NextResponse.json({
      message: `Voucher ${deleted.code} berhasil dihapus.`,
      id,
    });
  } catch (error: any) {
    console.error("Error deleting voucher:", error);
    return NextResponse.json(
      { error: "Gagal menghapus voucher: " + error.message },
      { status: 500 }
    );
  }
}
