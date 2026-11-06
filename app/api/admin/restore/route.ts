import { NextResponse } from "next/server";
import { performDatabaseRestore } from "@/scripts/restore-db";
import { getAdminPin } from "@/lib/pin";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { filename, pin } = body;

    // Validasi otorisasi PIN Admin sebelum restore
    const activePin = getAdminPin();
    if (pin && pin !== activePin) {
      return NextResponse.json({ error: "PIN Admin tidak valid. Otorisasi ditolak." }, { status: 401 });
    }

    const result = performDatabaseRestore(filename);
    if (!result.success) {
      return NextResponse.json({ error: result.error || "Gagal me-restore database" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Database berhasil dipulihkan (restore) dari file ${result.restoredFrom}.`,
      emergencyBackup: result.emergencyBackup,
    });
  } catch (error) {
    console.error("Gagal melakukan restore database:", error);
    return NextResponse.json({ error: "Terjadi kesalahan server saat memproses restore" }, { status: 500 });
  }
}

