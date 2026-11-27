/**
 * Next.js Server Instrumentation Hook
 * Menyalakan 3 Agentic AI (Watchdog, Stock Manager, Virtual GM) saat server Node.js berjalan.
 */
export async function register() {
  if (
    process.env.NEXT_RUNTIME === "nodejs" &&
    process.env.NEXT_PHASE !== "phase-production-build"
  ) {
    try {
      const { startAgents } = await import("@/lib/agents/dispatcher");
      startAgents();
    } catch (err) {
      console.error("[Instrumentation] Gagal menginisialisasi agen:", err);
    }
  }
}
