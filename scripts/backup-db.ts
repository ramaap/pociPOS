import fs from "fs";
import path from "path";

/**
 * Backup Database SQLite Teh Cap Poci
 * - Membuat snapshot aman file SQLite ke folder /backups
 * - Format nama: tehpoci_backup_YYYY-MM-DD_HH-mm-ss.sqlite
 * - Menyimpan metadata histori backup
 * - Kebijakan retensi otomatis: Simpan maksimal 30 backup terbaru (hapus yang usang)
 */

const DB_SOURCE_PATH = path.join(process.cwd(), "prisma", "dev.db");
const BACKUP_DIR = path.join(process.cwd(), "backups");
const LOG_FILE = path.join(BACKUP_DIR, "backup-history.json");
const MAX_BACKUPS_RETENTION = 30;

export interface BackupResult {
  success: boolean;
  filename?: string;
  filepath?: string;
  sizeBytes?: number;
  timestamp?: string;
  error?: string;
}

export function performDatabaseBackup(trigger: "scheduled_cron" | "manual" = "manual"): BackupResult {
  try {
    if (!fs.existsSync(DB_SOURCE_PATH)) {
      throw new Error(`File database sumber tidak ditemukan di: ${DB_SOURCE_PATH}`);
    }

    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }

    const now = new Date();
    const dateStr = now.toISOString().replace(/T/, "_").replace(/:/g, "-").replace(/\..+/, "");
    const filename = `tehpoci_backup_${dateStr}.sqlite`;
    const targetPath = path.join(BACKUP_DIR, filename);

    // Salin file dev.db
    fs.copyFileSync(DB_SOURCE_PATH, targetPath);

    // Salin juga WAL / SHM jika ada (untuk konsistensi ACID SQLite)
    const walSource = DB_SOURCE_PATH + "-wal";
    const shmSource = DB_SOURCE_PATH + "-shm";
    if (fs.existsSync(walSource)) {
      fs.copyFileSync(walSource, targetPath + "-wal");
    }
    if (fs.existsSync(shmSource)) {
      fs.copyFileSync(shmSource, targetPath + "-shm");
    }

    // Buat salinan latest.sqlite untuk akses cepat
    const latestPath = path.join(BACKUP_DIR, "latest.sqlite");
    try {
      fs.copyFileSync(DB_SOURCE_PATH, latestPath);
    } catch {}

    const stat = fs.statSync(targetPath);
    const sizeBytes = stat.size;

    // Baca atau buat log histori
    let history: any[] = [];
    if (fs.existsSync(LOG_FILE)) {
      try {
        history = JSON.parse(fs.readFileSync(LOG_FILE, "utf-8"));
      } catch {
        history = [];
      }
    }

    const newRecord = {
      filename,
      timestamp: now.toISOString(),
      sizeBytes,
      sizeReadable: (sizeBytes / 1024).toFixed(1) + " KB",
      trigger,
    };

    history.unshift(newRecord);

    // Retensi: bersihkan backup yang lebih dari MAX_BACKUPS_RETENTION
    if (history.length > MAX_BACKUPS_RETENTION) {
      const removed = history.slice(MAX_BACKUPS_RETENTION);
      history = history.slice(0, MAX_BACKUPS_RETENTION);

      for (const item of removed) {
        const oldFile = path.join(BACKUP_DIR, item.filename);
        if (fs.existsSync(oldFile)) {
          try {
            fs.unlinkSync(oldFile);
          } catch {}
        }
        if (fs.existsSync(oldFile + "-wal")) {
          try {
            fs.unlinkSync(oldFile + "-wal");
          } catch {}
        }
        if (fs.existsSync(oldFile + "-shm")) {
          try {
            fs.unlinkSync(oldFile + "-shm");
          } catch {}
        }
      }
    }

    fs.writeFileSync(LOG_FILE, JSON.stringify(history, null, 2), "utf-8");

    console.log(`[Backup Success] ${filename} (${(sizeBytes / 1024).toFixed(1)} KB) - Trigger: ${trigger}`);

    return {
      success: true,
      filename,
      filepath: targetPath,
      sizeBytes,
      timestamp: now.toISOString(),
    };
  } catch (err: any) {
    console.error("[Backup Error]:", err);
    return {
      success: false,
      error: err?.message || String(err),
    };
  }
}

// Jika dijalankan langsung dari command line (CLI)
if (process.argv[1] && (process.argv[1].endsWith("backup-db.ts") || process.argv[1].endsWith("backup-db.js"))) {
  console.log("Memulai backup database SQLite...");
  const res = performDatabaseBackup("manual");
  if (res.success) {
    console.log(`Backup berhasil disimpan di: ${res.filepath}`);
    process.exit(0);
  } else {
    console.error(`Backup gagal: ${res.error}`);
    process.exit(1);
  }
}

