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

  // Social Media Strategist Agent: 3x seminggu (Senin=1, Rabu=3, Jumat=5) jam 09:00 WIB
  SOCIAL_POST_DAYS: [1, 3, 5] as number[],
  SOCIAL_POST_HOUR: 9,
  SOCIAL_MAX_OUTPUT_TOKENS: 2400,

  // Anti-spam debounce
  ALERT_DEBOUNCE_MINUTES: 30,

  // Retensi memori jangka panjang (minimal 30 hari -> kita simpan 45 hari)
  MEMORY_RETENTION_DAYS: 45,

  // Kebijakan Keamanan Ketat: Dilarang mengubah data Admin/Backoffice tanpa konfirmasi eksplisit Owner
  REQUIRE_OWNER_CONFIRMATION_FOR_ADMIN_MUTATIONS: true,
  PENDING_CONFIRMATION_TTL_MINUTES: 5,

  // Gemini AI
  GEMINI_MAX_OUTPUT_TOKENS: 650,
};
