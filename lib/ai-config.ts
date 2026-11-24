import fs from "fs";
import path from "path";

const CONFIG_PATH = path.join(process.cwd(), "admin-config.json");

/**
 * Mengambil Google Gemini API Key aktif.
 * Prioritas:
 * 1. Runtime config `admin-config.json` (jika user menyimpan key dari UI admin)
 * 2. Environment variable `GEMINI_API_KEY` atau `GOOGLE_API_KEY` di `.env`
 */
export function getGeminiApiKey(): string {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const fileContent = fs.readFileSync(CONFIG_PATH, "utf-8");
      const data = JSON.parse(fileContent);
      if (data?.geminiApiKey && String(data.geminiApiKey).trim().length > 5) {
        return String(data.geminiApiKey).trim();
      }
    }
  } catch (err) {
    console.error("Gagal membaca admin-config.json:", err);
  }

  return (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "").trim();
}

/**
 * Menyimpan Google Gemini API Key baru ke runtime config.
 */
export function setGeminiApiKey(apiKey: string): void {
  let existingData: Record<string, any> = {};
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      existingData = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8"));
    }
  } catch (err) {
    console.error("Error reading admin-config.json:", err);
  }

  existingData.geminiApiKey = String(apiKey || "").trim();
  existingData.updatedAt = new Date().toISOString();
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(existingData, null, 2), "utf-8");
}
