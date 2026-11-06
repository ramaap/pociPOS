import fs from "fs";
import path from "path";

/**
 * Script Restore Database SQLite Teh Cap Poci
 * - Mengembalikan data database dari file backup .sqlite
 * - Sebelum restore, membuat snapshot darurat dari dev.db saat ini (pre-restore snapshot)
 * - Menghapus file .db-wal dan .db-shm jika ada untuk mencegah cache stale
 */

const DB_TARGET_PATH = path.join(process.cwd(), "prisma", "dev.db");
const BACKUP_DIR = path.join(process.cwd(), "backups");

export interface RestoreResult {
  success: boolean;
  restoredFrom?: string;
  emergencyBackup?: string;
  error?: string;
}

export function performDatabaseRestore(backupFilename?: string): RestoreResult {
  try {
    if (!fs.existsSync(BACKUP_DIR)) {
      throw new Error(`Folder backup tidak ditemukan: ${BACKUP_DIR}`);
    }

    // Jika filename tidak ditentukan, gunakan latest.sqlite atau file backup terbaru
    let targetBackup = backupFilename;
    if (!targetBackup) {
      if (fs.existsSync(path.join(BACKUP_DIR, "latest.sqlite"))) {
        targetBackup = "latest.sqlite";
      } else {
        const files = fs
          .readdirSync(BACKUP_DIR)
          .filter((f) => f.startsWith("tehpoci_backup_") && f.endsWith(".sqlite"))
          .sort()
          .reverse();
        if (files.length === 0) {
          throw new Error("Tidak ditemukan file backup untuk di-restore di folder /backups.");
        }
        targetBackup = files[0];
      }
    }

    const sourcePath = path.isAbsolute(targetBackup)
      ? targetBackup
      : path.join(BACKUP_DIR, path.basename(targetBackup));

    if (!fs.existsSync(sourcePath)) {
      throw new Error(`File backup sumber tidak ditemukan: ${sourcePath}`);
    }

    // 1. Snapshot Darurat: Simpan kondisi dev.db saat ini sebelum ditimpa
    let emergencyBackupName: string | undefined;
    if (fs.existsSync(DB_TARGET_PATH)) {
      const dateStr = new Date().toISOString().replace(/T/, "_").replace(/:/g, "-").replace(/\..+/, "");
      emergencyBackupName = `pre_restore_backup_${dateStr}.sqlite`;
      const emergencyPath = path.join(BACKUP_DIR, emergencyBackupName);
      try {
        fs.copyFileSync(DB_TARGET_PATH, emergencyPath);
      } catch (e) {
        console.warn("Gagal membuat snapshot darurat:", e);
      }
    }

    // 2. Timpa file prisma/dev.db dengan file backup
    fs.copyFileSync(sourcePath, DB_TARGET_PATH);

    // 3. Bersihkan file SQLite WAL & SHM jika ada
    const walPath = DB_TARGET_PATH + "-wal";
    const shmPath = DB_TARGET_PATH + "-shm";
    if (fs.existsSync(walPath)) {
      try {
        fs.unlinkSync(walPath);
      } catch {}
    }
    if (fs.existsSync(shmPath)) {
      try {
        fs.unlinkSync(shmPath);
      } catch {}
    }

    console.log(`[Restore Success] Database berhasil di-restore dari ${path.basename(sourcePath)}`);

    return {
      success: true,
      restoredFrom: path.basename(sourcePath),
      emergencyBackup: emergencyBackupName,
    };
  } catch (err: any) {
    console.error("[Restore Error]:", err);
    return {
      success: false,
      error: err?.message || String(err),
    };
  }
}

// Jika dijalankan via CLI
if (process.argv[1] && (process.argv[1].endsWith("restore-db.ts") || process.argv[1].endsWith("restore-db.js"))) {
  const chosenFile = process.argv[2];
  console.log(`Memulai proses restore database SQLite${chosenFile ? ` dari file: ${chosenFile}` : " dari backup terbaru"}...`);
  const res = performDatabaseRestore(chosenFile);
  if (res.success) {
    console.log(`✅ Restore Berhasil! Database telah dikembalikan ke kondisi: ${res.restoredFrom}`);
    if (res.emergencyBackup) {
      console.log(`ℹ️ Snapshot database sebelum restore disimpan di: ${res.emergencyBackup}`);
    }
    process.exit(0);
  } else {
    console.error(`❌ Restore Gagal: ${res.error}`);
    process.exit(1);
  }
}

