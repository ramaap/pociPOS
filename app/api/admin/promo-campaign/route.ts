import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const CAMPAIGN_ID = "buy2_get1";

// Helper hitung status kampanye secara real-time berdasarkan waktu saat ini
function computeCampaignStatus(campaign: any) {
  const now = new Date();
  if (!campaign.is_active) {
    return {
      status: "inactive" as const,
      statusLabel: "Nonaktif (Dimatikan Admin)",
      isCurrentlyActive: false,
      badgeColor: "bg-slate-100 text-slate-700 border-slate-300",
    };
  }

  const startAt = campaign.start_at ? new Date(campaign.start_at) : null;
  const endAt = campaign.end_at ? new Date(campaign.end_at) : null;

  if (startAt && now < startAt) {
    return {
      status: "scheduled" as const,
      statusLabel: "Terjadwal (Belum Dimulai)",
      isCurrentlyActive: false,
      badgeColor: "bg-amber-100 text-amber-800 border-amber-300",
    };
  }

  if (endAt && now > endAt) {
    return {
      status: "expired" as const,
      statusLabel: "Kedaluwarsa (Batas Waktu Berakhir)",
      isCurrentlyActive: false,
      badgeColor: "bg-rose-100 text-rose-800 border-rose-300",
    };
  }

  // Menghitung sisa durasi jika ada endAt
  let remainingText = "Tanpa batas waktu";
  if (endAt) {
    const diffMs = endAt.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    const remHours = diffHours % 24;
    if (diffDays > 0) {
      remainingText = `Sisa ${diffDays} hari ${remHours} jam lagi`;
    } else {
      const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      remainingText = `Sisa ${diffHours} jam ${diffMins} menit lagi`;
    }
  }

  return {
    status: "active" as const,
    statusLabel: "Aktif & Berjalan",
    isCurrentlyActive: true,
    remainingText,
    badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-300",
  };
}

// GET /api/admin/promo-campaign
export async function GET() {
  try {
    let campaign = await prisma.promoCampaign.findUnique({
      where: { id: CAMPAIGN_ID },
    });

    // Jika belum pernah ada di database, buat default aktif 3 hari
    if (!campaign) {
      const now = new Date();
      const defaultEnd = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000); // 3 hari dari sekarang
      campaign = await prisma.promoCampaign.create({
        data: {
          id: CAMPAIGN_ID,
          name: "Promo Beli 2 Varian Rasa Gratis 1 Teh Ori Jumbo",
          is_active: true,
          start_at: now,
          end_at: defaultEnd,
          min_flavored_qty: 2,
          free_product_name: "Jasmine Poci Iced Tea (Jumbo)",
          target_outlet_id: null,
        },
      });
    }

    const computed = computeCampaignStatus(campaign);

    return NextResponse.json({
      campaign,
      ...computed,
    });
  } catch (error: any) {
    console.error("Error fetching promo campaign:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data kampanye promo: " + error.message },
      { status: 500 }
    );
  }
}

// POST /api/admin/promo-campaign (Perbarui Waktu / Status oleh Admin)
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      is_active,
      start_at,
      end_at,
      target_outlet_id,
      min_flavored_qty = 2,
      free_product_name = "Jasmine Poci Iced Tea (Jumbo)",
      name = "Promo Beli 2 Varian Rasa Gratis 1 Teh Ori Jumbo",
    } = body;

    const startDate = start_at ? new Date(start_at) : null;
    const endDate = end_at ? new Date(end_at) : null;

    if (startDate && endDate && endDate <= startDate) {
      return NextResponse.json(
        { error: "Waktu selesai promo harus lebih besar dari waktu mulai." },
        { status: 400 }
      );
    }

    const campaign = await prisma.promoCampaign.upsert({
      where: { id: CAMPAIGN_ID },
      create: {
        id: CAMPAIGN_ID,
        name,
        is_active: is_active !== undefined ? Boolean(is_active) : true,
        start_at: startDate,
        end_at: endDate,
        min_flavored_qty: Number(min_flavored_qty) || 2,
        free_product_name,
        target_outlet_id: target_outlet_id || null,
      },
      update: {
        name,
        is_active: is_active !== undefined ? Boolean(is_active) : true,
        start_at: startDate,
        end_at: endDate,
        min_flavored_qty: Number(min_flavored_qty) || 2,
        free_product_name,
        target_outlet_id: target_outlet_id || null,
      },
    });

    const computed = computeCampaignStatus(campaign);

    return NextResponse.json({
      message: "Pengaturan kampanye promo berhasil disimpan.",
      campaign,
      ...computed,
    });
  } catch (error: any) {
    console.error("Error updating promo campaign:", error);
    return NextResponse.json(
      { error: "Gagal memperbarui kampanye promo: " + error.message },
      { status: 500 }
    );
  }
}
