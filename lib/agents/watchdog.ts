import { escapeHtml, sendMessage } from "@/lib/telegram";
import { AGENT_CONFIG } from "./config";
import { logAgentEvent } from "./memory";

const silentLunchSentMap = new Map<string, string>(); // outletId -> wibDateStr
const failedPinMap = new Map<string, number[]>(); // ip -> timestamps

function getWibTodayStr(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/**
 * Audit otomatis saat kasir mengirim form Tutup Shift (/closing)
 */
export async function auditShiftClosing(closingData: any): Promise<void> {
  try {
    const { prisma } = await import("@/lib/prisma");
    const outlet = closingData?.outlet_id
      ? await prisma.outlet.findUnique({ where: { id: closingData.outlet_id } })
      : null;
    const outletName = outlet?.name || closingData?.outlet_id || "Outlet";

    const cashDiff =
      (Number(closingData?.actual_cash) || 0) -
      (Number(closingData?.system_expected_cash) || 0);
    const cupDiff =
      (Number(closingData?.discrepancy_cup_reg) || 0) +
      (Number(closingData?.discrepancy_cup_jumbo) || 0);

    const absCash = Math.abs(cashDiff);
    const absCup = Math.abs(cupDiff);

    if (
      absCash > AGENT_CONFIG.CASH_DISCREPANCY_RED ||
      absCup > AGENT_CONFIG.MAX_BROKEN_CUPS_NORMAL
    ) {
      const summary = `Alert MERAH ${outletName}: Selisih kas Rp ${cashDiff.toLocaleString("id-ID")}, Selisih cup ${cupDiff} pcs`;
      await logAgentEvent({
        agentName: "watchdog",
        eventType: "red_alert",
        outletId: closingData?.outlet_id,
        summary,
        details: { cashDiff, cupDiff, notes: closingData?.notes || null },
      });

      const msg = [
        `🚨 <b>ALERT AUDIT WATCHDOG (MERAH)</b>`,
        `Kedai: <b>${escapeHtml(outletName)}</b>`,
        `Selisih Kas: <b>Rp ${cashDiff.toLocaleString("id-ID")}</b>`,
        `Selisih Cup: <b>${cupDiff} pcs</b>`,
        closingData?.notes
          ? `Catatan Kasir: <i>${escapeHtml(String(closingData.notes))}</i>`
          : "",
        `\nDisarankan segera cek laci kasir &amp; catatan fisik.`,
      ]
        .filter(Boolean)
        .join("\n");

      console.log("[Agent:Watchdog]", summary);
      await sendMessage(msg);
    } else if (absCash >= AGENT_CONFIG.CASH_DISCREPANCY_YELLOW) {
      const summary = `Alert Kuning ${outletName}: Selisih kas Rp ${cashDiff.toLocaleString("id-ID")}`;
      await logAgentEvent({
        agentName: "watchdog",
        eventType: "yellow_alert",
        outletId: closingData?.outlet_id,
        summary,
        details: { cashDiff, cupDiff },
      });
      console.log("[Agent:Watchdog]", summary);
    }
  } catch (err) {
    console.warn("[Agent:Watchdog] Error auditShiftClosing:", err);
  }
}

/**
 * Cek jam makan siang hening (12:00-14:00 WIB) pada kedai yang sedang buka.
 * Membandingkan Math.max(latestTxTime, outlet.last_opened_at) agar kedai yang baru buka tidak memicu false alarm.
 */
export async function checkSilentLunch(): Promise<void> {
  try {
    const { prisma } = await import("@/lib/prisma");
    const todayStr = getWibTodayStr();
    const now = Date.now();
    const thresholdMs = AGENT_CONFIG.SILENT_LUNCH_MINUTES * 60 * 1000;

    const openOutlets = await prisma.outlet.findMany({
      where: { active_status: true, shift_status: "open" },
    });

    for (const outlet of openOutlets) {
      if (silentLunchSentMap.get(outlet.id) === todayStr) continue;

      const latestTx = await prisma.transaction.findFirst({
        where: { outlet_id: outlet.id },
        orderBy: { created_at: "desc" },
        select: { created_at: true },
      });

      const lastTxTime = latestTx?.created_at?.getTime() || 0;
      const lastOpenTime = outlet.last_opened_at?.getTime() || 0;
      const baselineTime = Math.max(lastTxTime, lastOpenTime);

      if (baselineTime > 0 && now - baselineTime >= thresholdMs) {
        const silentMins = Math.round((now - baselineTime) / 60000);
        silentLunchSentMap.set(outlet.id, todayStr);

        const summary = `${outlet.name} tidak ada transaksi selama ${silentMins} menit di jam sibuk siang`;
        await logAgentEvent({
          agentName: "watchdog",
          eventType: "silent_lunch",
          outletId: outlet.id,
          summary,
        });

        await sendMessage(
          `⚠️ <b>ALERT WATCHDOG: JAM SIBUK HENING</b>\n` +
            `Kedai <b>${escapeHtml(outlet.name)}</b> berstatus buka, namun belum ada transaksi tercatat selama <b>${silentMins} menit</b>.`
        );
        console.log("[Agent:Watchdog]", summary);
      }
    }
  } catch (err) {
    console.warn("[Agent:Watchdog] Error checkSilentLunch:", err);
  }
}

/**
 * Mendeteksi percobaan brute-force PIN Admin (3x gagal dalam 10 menit)
 */
export async function recordFailedPin(ip: string): Promise<void> {
  try {
    const now = Date.now();
    const windowMs = AGENT_CONFIG.PIN_FAIL_WINDOW_MINUTES * 60 * 1000;
    const prev = (failedPinMap.get(ip) || []).filter((t) => now - t <= windowMs);
    prev.push(now);
    failedPinMap.set(ip, prev);

    if (prev.length >= AGENT_CONFIG.PIN_FAIL_THRESHOLD) {
      failedPinMap.delete(ip);
      const summary = `Percobaan PIN Admin salah ${prev.length}x dalam ${AGENT_CONFIG.PIN_FAIL_WINDOW_MINUTES} menit dari IP ${ip}`;
      await logAgentEvent({
        agentName: "watchdog",
        eventType: "pin_failed",
        summary,
        details: { ip, attempts: prev.length },
      });

      await sendMessage(
        `🚨 <b>ALERT KEAMANAN: PIN ADMIN SALAH ${prev.length}x</b>\n` +
          `Terdeteksi percobaan masuk Backoffice gagal berulang dari IP <code>${escapeHtml(ip)}</code>.`
      );
      console.log("[Agent:Watchdog]", summary);
    }
  } catch (err) {
    console.warn("[Agent:Watchdog] Error recordFailedPin:", err);
  }
}
