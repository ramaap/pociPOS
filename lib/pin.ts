import fs from "fs";
import path from "path";

const CONFIG_PATH = path.join(process.cwd(), "admin-config.json");

/**
 * Mengambil PIN Admin aktif.
 * Prioritas:
 * 1. File konfig runtime `admin-config.json` (jika user pernah mengubah PIN lewat UI)
 * 2. Environment variable `ADMIN_PIN` di file `.env`
 * 3. Default fallback "1234"
 */
export function getAdminPin(): string {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const fileContent = fs.readFileSync(CONFIG_PATH, "utf-8");
      const data = JSON.parse(fileContent);
      if (data?.pin) {
        return String(data.pin).trim();
      }
    }
  } catch (err) {
    console.error("Gagal membaca admin-config.json:", err);
  }

  return (process.env.ADMIN_PIN || "1234").trim();
}

/**
 * Menyimpan PIN Admin baru ke runtime config.
 */
export function setAdminPin(newPin: string): void {
  const payload = {
    pin: String(newPin).trim(),
    updatedAt: new Date().toISOString(),
  };
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(payload, null, 2), "utf-8");
}

