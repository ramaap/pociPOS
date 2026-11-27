import { getTelegramConfig, getUpdates } from "@/lib/telegram";
import { AGENT_CONFIG } from "./config";
import { readAgentState, writeAgentState } from "./state";
import * as watchdog from "./watchdog";
import * as stockManager from "./stock-manager";
import * as virtualGm from "./virtual-gm";
import * as socialMedia from "./social-media";

declare global {
  var __pociAgentsStarted: boolean | undefined;
}

const WEEKDAY_MAP: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

function getWibNowInfo(date = new Date()): {
  dateStr: string;
  hour: number;
  minute: number;
  dayOfWeek: number;
} {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
    hour12: false,
  }).formatToParts(date);

  const get = (type: string) => parts.find((p) => p.type === type)?.value || "00";
  return {
    dateStr: `${get("year")}-${get("month")}-${get("day")}`,
    hour: parseInt(get("hour"), 10) % 24,
    minute: parseInt(get("minute"), 10),
    dayOfWeek: WEEKDAY_MAP[get("weekday")] ?? date.getDay(),
  };
}

function getWibYesterdayStr(): string {
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
  return getWibNowInfo(yesterday).dateStr;
}

async function runScheduledChecks(): Promise<void> {
  try {
    if (!getTelegramConfig()) return;

    const { dateStr: todayStr, hour, dayOfWeek } = getWibNowInfo();
    const state = readAgentState();

    // 1. Briefing Stok Pagi (06:00 WIB atau catch-up 06:00-11:59 WIB)
    if (
      state.lastMorningDate !== todayStr &&
      hour >= AGENT_CONFIG.MORNING_BRIEFING_HOUR &&
      hour < 12
    ) {
      writeAgentState({ lastMorningDate: todayStr });
      await stockManager.sendMorningBriefing();
    }

    // 2. Laporan Malam Hari Ini (20:00 WIB atau catch-up 20:00-23:59 WIB)
    if (
      state.lastEveningDate !== todayStr &&
      hour >= AGENT_CONFIG.EVENING_REPORT_HOUR &&
      hour <= 23
    ) {
      writeAgentState({ lastEveningDate: todayStr });
      await virtualGm.sendEveningReport(todayStr);
    }

    // 3. Catch-up Laporan Malam Kemarin jika laptop nyala dini hari (00:00-05:59 WIB)
    if (hour >= 0 && hour < AGENT_CONFIG.MORNING_BRIEFING_HOUR) {
      const yesterdayStr = getWibYesterdayStr();
      if (
        state.lastEveningDate !== yesterdayStr &&
        state.lastEveningDate !== todayStr
      ) {
        writeAgentState({ lastEveningDate: yesterdayStr });
        await virtualGm.sendEveningReport(yesterdayStr);
      }
    }

    // 4. Cek Jam Makan Siang Hening (12:00-14:00 WIB)
    if (hour >= 12 && hour < 14) {
      await watchdog.checkSilentLunch();
    }

    // 5. Social Media Strategist Agent (3x seminggu: Senin, Rabu, Jumat pukul 09:00-17:59 WIB, 1 hari 1 ide)
    if (
      AGENT_CONFIG.SOCIAL_POST_DAYS.includes(dayOfWeek) &&
      state.lastSocialDate !== todayStr &&
      hour >= AGENT_CONFIG.SOCIAL_POST_HOUR &&
      hour < 18
    ) {
      writeAgentState({ lastSocialDate: todayStr });
      await socialMedia.generateAndSendSocialIdea({
        createdBy: "agent_draft",
        notifyTelegram: true,
      });
    }
  } catch (err) {
    console.warn("[Agent:Dispatcher] Error runScheduledChecks:", err);
  }
}

let pollErrorCount = 0;

async function pollTelegram(): Promise<void> {
  let nextDelayMs = 3000;

  try {
    const cfg = getTelegramConfig();
    if (!cfg) {
      // Fail-closed: tidak polling jika token atau owner chat ID belum valid
      nextDelayMs = 30000;
      return;
    }

    const state = readAgentState();

    // Saat pertama kali berjalan tanpa offset tersimpan, lewati backlog lama tanpa mengeksekusinya
    if (state.lastTelegramOffset === undefined) {
      const initRes = await getUpdates(-1);
      if (initRes.ok) {
        const lastUpdate = initRes.result[initRes.result.length - 1];
        const nextOffset = lastUpdate ? lastUpdate.update_id + 1 : 0;
        writeAgentState({ lastTelegramOffset: nextOffset });
        pollErrorCount = 0;
      } else if (initRes.status === 401) {
        console.warn("[Agent:Dispatcher] Telegram Bot Token tidak valid (401). Jeda 5 menit.");
        nextDelayMs = 300000;
      }
      return;
    }

    const res = await getUpdates(state.lastTelegramOffset);
    if (!res.ok) {
      if (res.status === 401) {
        console.warn("[Agent:Dispatcher] Telegram Bot Token tidak valid (401). Jeda 5 menit.");
        nextDelayMs = 300000;
      } else {
        pollErrorCount++;
        nextDelayMs = pollErrorCount >= 5 ? 60000 : pollErrorCount >= 2 ? 15000 : 5000;
      }
      return;
    }

    pollErrorCount = 0;

    for (const update of res.result) {
      // Simpan offset SEBELUM memanggil AI agar tidak terjadi double-reply
      writeAgentState({ lastTelegramOffset: update.update_id + 1 });

      const senderChatId =
        update?.message?.chat?.id ?? update?.callback_query?.from?.id;

      // Abaikan diam-diam siapa pun selain Owner
      if (String(senderChatId) !== String(cfg.ownerChatId)) {
        continue;
      }

      if (update?.message?.text) {
        await virtualGm.handleOwnerMessage(update.message.text);
      } else if (update?.callback_query) {
        await virtualGm.handleCallbackQuery(update.callback_query);
      }
    }
  } catch (err) {
    pollErrorCount++;
    nextDelayMs = pollErrorCount >= 5 ? 60000 : pollErrorCount >= 2 ? 15000 : 5000;
    console.warn("[Agent:Dispatcher] Polling error:", err);
  } finally {
    setTimeout(pollTelegram, nextDelayMs);
  }
}

export function startAgents(): void {
  if (globalThis.__pociAgentsStarted) return;
  globalThis.__pociAgentsStarted = true;

  console.log("[Agent:Dispatcher] Initialized (4 Agents + 30-Day Memory Active)");

  // Jalankan pengecekan jadwal segera & setiap 60 detik
  runScheduledChecks().catch(() => {});
  setInterval(() => {
    runScheduledChecks().catch(() => {});
  }, 60 * 1000);

  // Mulai Long Polling Telegram sekuensial
  setTimeout(() => {
    pollTelegram().catch(() => {});
  }, 2000);
}

// ================= NON-BLOCKING EVENT HOOKS =================

export async function onCheckout(
  outletId: string,
  materialsDeducted: Array<{ name: string; remainingStock: number; unit: string }>
): Promise<void> {
  try {
    await stockManager.checkThresholds(outletId, materialsDeducted);
  } catch {}
}

export async function onShiftClosed(closingData: any): Promise<void> {
  try {
    await watchdog.auditShiftClosing(closingData);
  } catch {}
}

export async function onPinFailed(ip: string): Promise<void> {
  try {
    await watchdog.recordFailedPin(ip);
  } catch {}
}
