/**
 * Konfigurasi Threshold, Jadwal, dan Retensi Memori Agentic AI
 */
export const AGENT_CONFIG = {
  // Batas stok minimum di Kedai/Outlet
  BOOTH_REORDER_POINTS: {
    "Cup Reguler": 30,
    "Cup Jumbo": 30,
    Sedotan: 30,
    "Gula Cair": 500,
    default: 20,
  } as Record<string, number>,

  // Batas stok minimum di Gudang Pusat (Central Kitchen)
  CENTRAL_REORDER_POINTS: {
    "Cup Reguler": 300,
    "Cup Jumbo": 300,
    Sedotan: 500,
    "Gula Cair": 5000,
    "Kantong Teh": 20,
    default: 50,
  } as Record<string, number>,

  // Watchdog thresholds
  CASH_DISCREPANCY_YELLOW: 5000, // Rp (masuk laporan malam)
  CASH_DISCREPANCY_RED: 15000, // Rp (alert langsung ke Telegram)
  MAX_BROKEN_CUPS_NORMAL: 3, // pcs
  SILENT_LUNCH_MINUTES: 45, // menit tanpa transaksi di jam 12:00-14:00 WIB
  PIN_FAIL_THRESHOLD: 3, // percobaan gagal
  PIN_FAIL_WINDOW_MINUTES: 10,

  // Jadwal harian (WIB = UTC+7)
  MORNING_BRIEFING_HOUR: 6, // 06:00 WIB
  EVENING_REPORT_HOUR: 20, // 20:00 WIB (setelah closing weekend jam 19:00)

  // Anti-spam debounce
  ALERT_DEBOUNCE_MINUTES: 30,

  // Retensi memori jangka panjang (minimal 30 hari -> kita simpan 45 hari)
  MEMORY_RETENTION_DAYS: 45,

  // Gemini AI
  GEMINI_MAX_OUTPUT_TOKENS: 650,
};
