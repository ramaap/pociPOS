import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { performDatabaseBackup } from "@/scripts/backup-db";
import { getAdminPin } from "@/lib/pin";

const BACKUP_DIR = path.join(process.cwd(), "backups");
const LOG_FILE = path.join(BACKUP_DIR, "backup-history.json");

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const downloadFile = searchParams.get("download");

    // Unduh file backup
    if (downloadFile) {
      // Cegah path traversal
      const safeFilename = path.basename(downloadFile);
      const filePath = path.join(BACKUP_DIR, safeFilename);

      if (!fs.existsSync(filePath)) {
        return NextResponse.json({ error: "File backup tidak ditemukan" }, { status: 404 });
      }

      const fileBuffer = fs.readFileSync(filePath);
      return new NextResponse(fileBuffer, {
        headers: {
          "Content-Disposition": `attachment; filename="${safeFilename}"`,
          "Content-Type": "application/x-sqlite3",
        },
      });
    }

    // Ambil histori backup
    let history: any[] = [];
    if (fs.existsSync(LOG_FILE)) {
      try {
        history = JSON.parse(fs.readFileSync(LOG_FILE, "utf-8"));
      } catch {
        history = [];
      }
    }

    return NextResponse.json({
      backups: history,
      totalCount: history.length,
      latestBackup: history[0] || null,
    });
  } catch (error) {
    console.error("Gagal mengambil status backup:", error);
    return NextResponse.json({ error: "Gagal mengambil data backup" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { pin, trigger = "manual" } = body;

    // Validasi otorisasi PIN jika trigger manual dari user
    if (trigger === "manual") {
      const activePin = getAdminPin();
      if (pin && pin !== activePin) {
        return NextResponse.json({ error: "PIN Admin tidak valid" }, { status: 401 });
      }
    }

    const result = performDatabaseBackup(trigger === "scheduled_cron" ? "scheduled_cron" : "manual");
    if (!result.success) {
      return NextResponse.json({ error: result.error || "Gagal membuat backup database" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Backup database SQLite berhasil dibuat (${result.filename})`,
      backup: result,
    });
  } catch (error) {
    console.error("Gagal mengeksekusi backup:", error);
    return NextResponse.json({ error: "Terjadi kesalahan server saat memproses backup" }, { status: 500 });
  }
}

