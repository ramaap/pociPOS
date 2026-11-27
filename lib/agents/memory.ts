import { AGENT_CONFIG } from "./config";
import { askGemini } from "./gemini";

/**
 * Lapisan Memori Jangka Panjang (>= 30 hari) & Pembelajaran Perilaku Owner
 * - AgentEventLog: Riwayat kejadian & peringatan Watchdog/Stock/GM selama 45 hari.
 * - OwnerChatMemory: Riwayat percakapan Owner <-> Virtual GM selama 45 hari.
 * - OwnerBehaviorProfile: Preferensi & kebiasaan permintaan Owner yang dipelajari otomatis.
 */

export async function logAgentEvent(params: {
  agentName: "watchdog" | "stock_manager" | "virtual_gm" | "social_media";
  eventType: string;
  outletId?: string | null;
  summary: string;
  details?: Record<string, any> | string | null;
}): Promise<void> {
  try {
    const { prisma } = await import("@/lib/prisma");
    await prisma.agentEventLog.create({
      data: {
        agent_name: params.agentName,
        event_type: params.eventType,
        outlet_id: params.outletId || null,
        summary: params.summary.slice(0, 500),
        details: params.details
          ? typeof params.details === "string"
            ? params.details.slice(0, 2000)
            : JSON.stringify(params.details).slice(0, 2000)
          : null,
      },
    });
  } catch (err) {
    console.warn("[Agent:Memory] Gagal mencatat event:", err);
  }
}

export async function saveOwnerChat(
  role: "owner" | "assistant",
  message: string,
  topic?: string
): Promise<void> {
  try {
    const { prisma } = await import("@/lib/prisma");
    await prisma.ownerChatMemory.create({
      data: {
        role,
        message: message.slice(0, 3000),
        topic: topic || null,
      },
    });
  } catch (err) {
    console.warn("[Agent:Memory] Gagal menyimpan chat:", err);
  }
}

export async function getOwnerMemoryContext(): Promise<{
  recentChatsText: string;
  eventHistoryText: string;
  behaviorProfileText: string;
}> {
  try {
    const { prisma } = await import("@/lib/prisma");
    const since30Days = new Date(Date.now() - 35 * 24 * 60 * 60 * 1000);

    const [recentChats, recentEvents, profiles] = await Promise.all([
      prisma.ownerChatMemory.findMany({
        where: { created_at: { gte: since30Days } },
        orderBy: { created_at: "desc" },
        take: 14,
      }),
      prisma.agentEventLog.findMany({
        where: { created_at: { gte: since30Days } },
        orderBy: { created_at: "desc" },
        take: 40,
      }),
      prisma.ownerBehaviorProfile.findMany({
        orderBy: { updated_at: "desc" },
      }),
    ]);

    const recentChatsText =
      recentChats.length > 0
        ? recentChats
            .reverse()
            .map((c) => {
              const t = c.created_at.toLocaleDateString("id-ID", {
                timeZone: "Asia/Jakarta",
                day: "2-digit",
                month: "2-digit",
              });
              return `[${t} ${c.role === "owner" ? "Owner" : "GM"}]: ${c.message}`;
            })
            .join("\n")
        : "(Belum ada riwayat chat 30 hari terakhir)";

    const eventHistoryText =
      recentEvents.length > 0
        ? recentEvents
            .map((e) => {
              const t = e.created_at.toLocaleString("id-ID", {
                timeZone: "Asia/Jakarta",
                day: "2-digit",
                month: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
              });
              return `- [${t}] [${e.agent_name}/${e.event_type}] ${e.summary}`;
            })
            .join("\n")
        : "(Belum ada kejadian/alert tercatat dalam 30 hari terakhir)";

    const behaviorProfileText =
      profiles.length > 0
        ? profiles.map((p) => `- ${p.key}: ${p.value}`).join("\n")
        : "(Belum ada preferensi khusus yang dipelajari)";

    return { recentChatsText, eventHistoryText, behaviorProfileText };
  } catch (err) {
    console.warn("[Agent:Memory] Gagal membaca memori:", err);
    return {
      recentChatsText: "",
      eventHistoryText: "",
      behaviorProfileText: "",
    };
  }
}

export async function getBehaviorInstructions(): Promise<string> {
  try {
    const { prisma } = await import("@/lib/prisma");
    const profiles = await prisma.ownerBehaviorProfile.findMany({
      orderBy: { updated_at: "desc" },
    });
    if (profiles.length === 0) return "";
    return profiles.map((p) => `- ${p.key}: ${p.value}`).join("\n");
  } catch {
    return "";
  }
}

/**
 * Belajar dari pesan Owner: mengekstrak preferensi gaya laporan, fokus cabang/metrik,
 * atau kebiasaan permintaan yang berulang, lalu menyimpannya ke OwnerBehaviorProfile.
 */
export async function learnFromOwnerMessage(ownerMessage: string): Promise<void> {
  try {
    const existingProfile = await getBehaviorInstructions();
    const systemPrompt = `Kamu adalah Modul Pembelajaran Perilaku Owner untuk sistem POS Teh Poci.
Tugasmu: analisis pesan terbaru dari Owner dan lihat apakah ada preferensi, kebiasaan, atau aturan kerja baru yang perlu diingat untuk interaksi & laporan ke depan (contoh: suka format poin singkat, sering tanya cabang tertentu, minta laporan malam selalu sertakan metrik X, tidak suka info Y, dll).
Balas HANYA dengan JSON valid tanpa markdown fence:
{"shouldUpdate": true/false, "updates": [{"key": "nama_preferensi_singkat", "value": "deskripsi singkat preferensi"}]}
Jika pesan hanya pertanyaan biasa tanpa preferensi baru yang jelas, balas {"shouldUpdate": false, "updates": []}.`;

    const context = `Profil perilaku saat ini:\n${existingProfile || "(kosong)"}`;
    const raw = await askGemini(systemPrompt, ownerMessage, context, 250);
    if (!raw) return;

    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return;

    const parsed = JSON.parse(jsonMatch[0]);
    if (!parsed?.shouldUpdate || !Array.isArray(parsed.updates)) return;

    const { prisma } = await import("@/lib/prisma");
    for (const item of parsed.updates.slice(0, 3)) {
      if (item?.key && item?.value) {
        const cleanKey = String(item.key)
          .toLowerCase()
          .replace(/[^a-z0-9_]/g, "_")
          .slice(0, 50);
        const cleanVal = String(item.value).trim().slice(0, 300);
        if (cleanKey && cleanVal) {
          await prisma.ownerBehaviorProfile.upsert({
            where: { key: cleanKey },
            update: { value: cleanVal },
            create: { key: cleanKey, value: cleanVal },
          });
          console.log(`[Agent:Memory] Belajar preferensi baru -> ${cleanKey}: ${cleanVal}`);
        }
      }
    }
  } catch {
    // Non-critical: abaikan jika gagal ekstraksi
  }
}

/**
 * Membersihkan memori yang lebih tua dari MEMORY_RETENTION_DAYS (default 45 hari)
 */
export async function pruneOldMemories(): Promise<void> {
  try {
    const { prisma } = await import("@/lib/prisma");
    const cutoff = new Date(
      Date.now() - AGENT_CONFIG.MEMORY_RETENTION_DAYS * 24 * 60 * 60 * 1000
    );
    await Promise.all([
      prisma.agentEventLog.deleteMany({ where: { created_at: { lt: cutoff } } }),
      prisma.ownerChatMemory.deleteMany({ where: { created_at: { lt: cutoff } } }),
    ]);
  } catch {}
}
