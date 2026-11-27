import fs from "fs";
import path from "path";
import { escapeHtml, sendAudioFile, sendMessage } from "@/lib/telegram";
import { AGENT_CONFIG } from "./config";
import { askGeminiRich, GeminiGroundingSource, generateGeminiTTS } from "./gemini";
import { logAgentEvent } from "./memory";

export interface SocialSceneItem {
  scene_no: number;
  time_range: string;
  visual_action: string;
  on_screen_text: string;
  voiceover: string;
  camera_note: string;
}

export interface GeneratedSocialDraftPayload {
  platform: string;
  trend_topic: string;
  post_idea: string;
  scenes: SocialSceneItem[];
  voiceover_script: string;
  editing_notes: string;
  caption_ig: string;
  caption_tiktok: string;
  prompt_image_flow: string;
  prompt_video_flow: string;
  negative_prompt: string;
  image_search_query: string;
}

const BANNED_AI_PHRASES = [
  "kesegaran tiada tara",
  "perpaduan sempurna",
  "sensasi luar biasa",
  "yuk buruan serbu",
  "jangan sampai ketinggalan",
  "manjakan lidah",
  "cita rasa autentik",
  "menyegarkan harimu",
  "tak tertandingi",
  "teman setia di segala suasana",
  "nikmati kelezatan",
  "hadir untuk menemani",
  "tunggu apa lagi",
  "dijamin ketagihan",
];

function getWibTodayStr(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/**
 * Crawl Google Trends RSS Indonesia (gratis, ringan, real-time)
 */
async function fetchIndonesiaGoogleTrends(): Promise<string[]> {
  try {
    const res = await fetch("https://trends.google.com/trending/rss?geo=ID", {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return [];
    const xml = await res.text();
    const itemMatches = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
    const trends: string[] = [];

    for (const item of itemMatches.slice(0, 12)) {
      const titleMatch = item.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/);
      const trafficMatch = item.match(/<ht:approx_traffic>([^<]+)<\/ht:approx_traffic>/);
      const title = titleMatch?.[1]?.trim();
      if (title) {
        trends.push(trafficMatch?.[1] ? `${title} (${trafficMatch[1]} pencarian)` : title);
      }
    }
    return trends;
  } catch {
    return [];
  }
}

export interface RealGoogleImageResult {
  title: string;
  imageUrl: string;
  link: string;
}

async function searchRealGoogleImages(query: string): Promise<RealGoogleImageResult[]> {
  const apiKey = (process.env.SERPER_API_KEY || "").trim();
  if (!apiKey || !query.trim()) return [];

  try {
    const res = await fetch("https://google.serper.dev/images", {
      method: "POST",
      headers: {
        "X-API-KEY": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        q: query,
        gl: "id",
        hl: "id",
        num: 4,
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    const images = Array.isArray(data?.images) ? data.images : [];
    return images
      .slice(0, 4)
      .map((img: any) => ({
        title: String(img?.title || "Referensi Gambar").trim(),
        imageUrl: String(img?.imageUrl || "").trim(),
        link: String(img?.link || "").trim(),
      }))
      .filter((i: RealGoogleImageResult) => Boolean(i.imageUrl));
  } catch {
    return [];
  }
}

function buildGoogleImagesSearchUrl(query: string): string {
  return `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(query)}`;
}

async function gatherPosMarketingContext() {
  const { prisma } = await import("@/lib/prisma");
  const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const since45d = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000);

  const [outlets, products, recentTxItems, activeVouchers, promoCampaign, recentDrafts] = await Promise.all([
    prisma.outlet.findMany({ where: { active_status: true }, select: { name: true, code: true } }),
    prisma.product.findMany({ where: { active_status: true }, select: { id: true, name: true, category: true, price: true } }),
    prisma.transactionItem.findMany({
      where: { transaction: { created_at: { gte: since7d } } },
      select: { product_id: true, quantity: true },
    }),
    prisma.promoVoucher.findMany({
      where: { status: "active" },
      take: 5,
      select: { code: true, product_name: true },
    }),
    prisma.promoCampaign.findFirst({ where: { is_active: true } }),
    prisma.socialContentDraft.findMany({
      where: { createdAt: { gte: since45d } },
      orderBy: { createdAt: "desc" },
      take: 12,
      select: { scheduled_date: true, platform: true, trend_topic: true, post_idea: true },
    }),
  ]);

  const qtyByProduct = new Map<string, number>();
  for (const item of recentTxItems) {
    qtyByProduct.set(item.product_id, (qtyByProduct.get(item.product_id) || 0) + item.quantity);
  }

  const menuPerf = products
    .map((m) => ({
      name: m.name,
      category: m.category,
      price: m.price,
      sold7d: qtyByProduct.get(m.id) || 0,
    }))
    .sort((a, b) => b.sold7d - a.sold7d);

  return {
    outlets,
    topMenus: menuPerf.slice(0, 5),
    slowMenus: [...menuPerf].reverse().slice(0, 4),
    activeVouchers,
    promoCampaign,
    recentDrafts,
  };
}

function findBannedPhrases(text: string): string[] {
  const lower = text.toLowerCase();
  return BANNED_AI_PHRASES.filter((phrase) => lower.includes(phrase));
}

function normalizeScenes(rawScenes: any): SocialSceneItem[] {
  if (!Array.isArray(rawScenes)) return [];
  return rawScenes
    .map((s: any, idx: number) => ({
      scene_no: Number(s?.scene_no) || idx + 1,
      time_range: String(s?.time_range || `${idx * 4}-${(idx + 1) * 4} dtk`).trim(),
      visual_action: String(s?.visual_action || "").trim(),
      on_screen_text: String(s?.on_screen_text || "").trim(),
      voiceover: String(s?.voiceover || "").trim(),
      camera_note: String(s?.camera_note || "Handheld eye-level").trim(),
    }))
    .filter((s) => Boolean(s.visual_action || s.voiceover));
}

function parseSocialJson(raw: string): GeneratedSocialDraftPayload | null {
  try {
    const cleaned = raw
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```$/i, "")
      .trim();
    const startIdx = cleaned.indexOf("{");
    const endIdx = cleaned.lastIndexOf("}");
    if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) return null;
    const obj = JSON.parse(cleaned.slice(startIdx, endIdx + 1));

    if (!obj?.post_idea || !obj?.caption_ig || !obj?.caption_tiktok) return null;

    const scenes = normalizeScenes(obj.scenes);
    const combinedVo =
      String(obj.voiceover_script || "").trim() ||
      scenes
        .map((s) => s.voiceover)
        .filter(Boolean)
        .join(" ... ");

    return {
      platform: String(obj.platform || "Instagram Reels & TikTok").trim(),
      trend_topic: String(obj.trend_topic || "Tren minuman & cuaca terik Indonesia").trim(),
      post_idea: String(obj.post_idea).trim(),
      scenes,
      voiceover_script: combinedVo,
      editing_notes: String(
        obj.editing_notes ||
          "Cut cepat tiap 1.5-2.5 detik di Scene 1-2. Taruh teks on-screen di area tengah-atas agar tidak tertutup caption TikTok/Reels. Tambahkan SFX es batu & tuang teh."
      ).trim(),
      caption_ig: String(obj.caption_ig).trim(),
      caption_tiktok: String(obj.caption_tiktok).trim(),
      prompt_image_flow: String(obj.prompt_image_flow || "").trim(),
      prompt_video_flow: String(obj.prompt_video_flow || "").trim(),
      negative_prompt: String(
        obj.negative_prompt ||
          "3d render, glossy plastic cup, studio stock photo, western cafe background, distorted text, extra fingers, oversaturated AI look"
      ).trim(),
      image_search_query: String(obj.image_search_query || "es teh poci gerobak pinggir jalan indonesia").trim(),
    };
  } catch {
    return null;
  }
}

function pickTargetPlatform(recentDrafts: Array<{ platform: string }>): string {
  const last = (recentDrafts[0]?.platform || "").toLowerCase();
  if (last.includes("tiktok")) return "Instagram Reels";
  if (last.includes("reels")) return "Instagram Carousel";
  return "TikTok";
}

export function getTtsAudioFilePath(draftId: string): string {
  const safeId = draftId.replace(/[^a-zA-Z0-9_-]/g, "");
  return path.join(process.cwd(), "public", "tts", `vo-${safeId}.wav`);
}

export async function synthesizeDraftVoiceover(
  draftId: string,
  scriptText: string,
  voiceName = "Kore"
): Promise<{ wavBuffer: Buffer; audioUrl: string; voiceName: string } | null> {
  const ttsRes = await generateGeminiTTS(scriptText, voiceName);
  if (!ttsRes) return null;

  const filePath = getTtsAudioFilePath(draftId);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, ttsRes.wavBuffer);

  const audioUrl = `/api/admin/social-content/tts?draftId=${encodeURIComponent(draftId)}&v=${Date.now()}`;
  const { prisma } = await import("@/lib/prisma");
  await prisma.socialContentDraft.update({
    where: { id: draftId },
    data: {
      voiceover_audio_url: audioUrl,
      tts_voice: ttsRes.voiceName,
    },
  });

  return { wavBuffer: ttsRes.wavBuffer, audioUrl, voiceName: ttsRes.voiceName };
}

export async function generateAndSendSocialIdea(options?: {
  platformHint?: string;
  customTopic?: string;
  voiceName?: string;
  createdBy?: "agent_draft" | "manual_trigger";
  notifyTelegram?: boolean;
}) {
  const { prisma } = await import("@/lib/prisma");
  const todayStr = getWibTodayStr();
  const createdBy = options?.createdBy ?? "agent_draft";
  const notifyTelegram = options?.notifyTelegram ?? true;
  const preferredVoice = options?.voiceName || "Kore";

  const [trendsRss, posCtx] = await Promise.all([
    fetchIndonesiaGoogleTrends(),
    gatherPosMarketingContext(),
  ]);

  const targetPlatform = options?.platformHint || pickTargetPlatform(posCtx.recentDrafts);

  const posContextText = `
Tanggal Hari Ini (WIB): ${todayStr}
Target Platform Utama Hari Ini: ${targetPlatform}
Cabang Aktif: ${posCtx.outlets.map((o) => o.name).join(", ") || "Kedai Teh Poci"}
Menu Terlaris 7 Hari Terakhir:
${posCtx.topMenus.map((m) => `- ${m.name} (Rp ${m.price.toLocaleString("id-ID")}): terjual ${m.sold7d} cup`).join("\n") || "(belum ada transaksi)"}

Menu yang Perlu Didorong Penjualannya:
${posCtx.slowMenus.map((m) => `- ${m.name} (Rp ${m.price.toLocaleString("id-ID")}): terjual ${m.sold7d} cup`).join("\n") || "(tidak ada)"}

Promo/Voucher Aktif:
${posCtx.promoCampaign?.is_active ? `Promo Campaign aktif: ${posCtx.promoCampaign.name} (beli ${posCtx.promoCampaign.min_flavored_qty} varian rasa gratis 1 ${posCtx.promoCampaign.free_product_name})` : "Tidak ada promo campaign aktif"}
${posCtx.activeVouchers.length > 0 ? `Voucher aktif: ${posCtx.activeVouchers.map((v) => `${v.code} (gratis ${v.product_name})`).join(", ")}` : ""}

Tren Indonesia Hari Ini dari Google Trends RSS:
${trendsRss.length > 0 ? trendsRss.map((t) => `- ${t}`).join("\n") : "(Gunakan Google Search Grounding untuk cek tren viral Indonesia 7 hari terakhir)"}

Riwayat Ide Konten 45 Hari Terakhir (DILARANG mengulang topik/angle yang sama):
${posCtx.recentDrafts.map((d) => `- [${d.scheduled_date}] (${d.platform}) ${d.trend_topic}: ${d.post_idea.slice(0, 100)}`).join("\n") || "(belum ada riwayat)"}
`.trim();

  const systemPrompt = `Kamu adalah tim kreatif lengkap (Social Media Strategist + Script Writer Scene-by-Scene + Video Editor Director) khusus UMKM F&B Indonesia untuk brand Es Teh Poci.

TUGAS UTAMA:
1. Gunakan Google Search untuk mencari tren, meme, sound/format viral, atau obrolan netizen Indonesia di Instagram & TikTok yang sedang ramai DALAM 7 HARI TERAKHIR.
2. Pilih 1 ide konten paling relevan dengan produk nyata Teh Poci dari data POS.
3. JAMINAN ANTI-AI SLOP (WAJIB):
   - DILARANG KERAS memakai kalimat klise AI Indonesia: ${BANNED_AI_PHRASES.join(", ")}.
   - Gaya bahasa harus terdengar seperti manusia/kreator Indonesia asli: obrolan sehari-hari, ringan, punchy, jujur.
   - Maksimal 2-3 emoji per caption, maksimal 4-5 hashtag lokal relevan.
4. SCRIPT WRITER (SCENE-BY-SCENE):
   - Buat 4 sampai 5 scene berurutan (total durasi 15-24 detik untuk Reels/TikTok, atau slide-by-slide jika Carousel).
   - Setiap scene WAJIB punya: scene_no, time_range (mis. "0-3 dtk (Hook)"), visual_action, on_screen_text (singkat maks 7 kata), voiceover (bahasa lisan natural untuk dibacakan TTS), camera_note.
   - Buat juga voiceover_script: gabungan kalimat voiceover semua scene yang mengalir alami dengan jeda "..." untuk dibacakan Text-to-Speech.
5. VIDEO EDITOR NOTES:
   - Berikan editing_notes spesifik: tempo cut, efek transisi, cue SFX (es batu/sedotan/ramai siang), vibe musik latar, dan area aman teks.
6. PROMPT GOOGLE FLOW / GEMINI (READY TO PASTE):
   - prompt_image_flow: Bahasa Inggris, gaya street photography nyata Indonesia (natural daylight, clear plastic cup condensation, authentic roadside booth), BUKAN 3D render/plastik CGI.
   - prompt_video_flow: Bahasa Inggris khusus Google Flow / Veo 9:16 vertical video (camera motion, action, ambient sound).
   - negative_prompt & image_search_query (query Google Images nyata).

OUTPUT WAJIB: Kembalikan HANYA 1 objek JSON valid tanpa teks tambahan di luar JSON:
{
  "platform": "Instagram Reels | Instagram Carousel | TikTok",
  "trend_topic": "Ringkasan tren viral 7 hari terakhir",
  "post_idea": "Ringkasan konsep + Hook utama",
  "scenes": [
    {
      "scene_no": 1,
      "time_range": "0-3 dtk (Hook)",
      "visual_action": "...",
      "on_screen_text": "...",
      "voiceover": "...",
      "camera_note": "..."
    }
  ],
  "voiceover_script": "Naskah voiceover lengkap siap TTS...",
  "editing_notes": "Panduan tempo cut, SFX, audio trend, dan safe zone...",
  "caption_ig": "...",
  "caption_tiktok": "...",
  "prompt_image_flow": "...",
  "prompt_video_flow": "...",
  "negative_prompt": "...",
  "image_search_query": "..."
}`;

  const userPrompt = options?.customTopic
    ? `Buatkan 1 konsep konten + script scene-by-scene + voiceover TTS + panduan editor untuk ${targetPlatform} dengan arahan Owner: "${options.customTopic}". Tetap kaitkan dengan tren 7 hari terakhir & bebas AI slop.`
    : `Carikan 1 tren viral Indonesia 7 hari terakhir dan buatkan paket konten lengkap (ide, script scene-by-scene, naskah voiceover TTS, editing notes, caption, prompt Google Flow) untuk ${targetPlatform} hari ini.`;

  let groundingSources: GeminiGroundingSource[] = [];
  let parsed: GeneratedSocialDraftPayload | null = null;

  const firstAttempt = await askGeminiRich({
    systemPrompt,
    userMessage: userPrompt,
    context: posContextText,
    maxOutputTokens: AGENT_CONFIG.SOCIAL_MAX_OUTPUT_TOKENS,
    temperature: 0.75,
    useSearchGrounding: true,
    timeoutMs: 30000,
  });

  if (firstAttempt) {
    groundingSources = firstAttempt.groundingSources;
    parsed = parseSocialJson(firstAttempt.text);
  }

  // Self-critique Anti-AI Slop pass
  if (parsed) {
    const slopFound = findBannedPhrases(
      `${parsed.post_idea}\n${parsed.voiceover_script}\n${parsed.caption_ig}\n${parsed.caption_tiktok}`
    );
    if (slopFound.length > 0) {
      const critique = await askGeminiRich({
        systemPrompt:
          "Kamu adalah Editor Anti-AI-Slop. Revisi JSON agar seluruh script voiceover, teks layar, dan caption terdengar 100% seperti obrolan kreator Indonesia asli. Kembalikan JSON dengan skema persis sama.",
        userMessage: `Revisi JSON ini karena ada frasa klise (${slopFound.join(", ")}):\n${JSON.stringify(parsed)}`,
        context: posContextText,
        maxOutputTokens: AGENT_CONFIG.SOCIAL_MAX_OUTPUT_TOKENS,
        temperature: 0.7,
      });
      const revised = critique ? parseSocialJson(critique.text) : null;
      if (revised) parsed = revised;
    }
  }

  // Deterministic fallback jika Gemini tidak aktif/gagal parse
  if (!parsed) {
    const heroMenu = posCtx.topMenus[0]?.name || "Es Teh Poci Ori";
    const pushMenu = posCtx.slowMenus[0]?.name || heroMenu;
    const trendLabel = trendsRss[0] || "Cuaca panas terik jam makan siang";
    const fallbackScenes: SocialSceneItem[] = [
      {
        scene_no: 1,
        time_range: "0-3 dtk (Hook)",
        visual_action: "Close-up kasir mengambil gelas penuh es batu kristal di bawah sinar matahari terik.",
        on_screen_text: "Jam 1 siang kepala ngebul?",
        voiceover: "Jam segini matahari lagi niat banget nyengat, kepala mulai ngebul.",
        camera_note: "Handheld fast push-in ke gelas es",
      },
      {
        scene_no: 2,
        time_range: "3-9 dtk (Setup)",
        visual_action: `Menuang ${heroMenu} dingin ke dalam cup sampai embun langsung muncul di dinding gelas.`,
        on_screen_text: "Obatnya cuma satu yang dingin",
        voiceover: `Kalau udah begini, obat paling bener ya mampir bentar nyari yang dingin seger kayak ${heroMenu}.`,
        camera_note: "Slow-mo angle miring 45 derajat",
      },
      {
        scene_no: 3,
        time_range: "9-15 dtk (Varian)",
        visual_action: `Menjajarkan 2 cup ${heroMenu} dan ${pushMenu} yang baru selesai di-press sealer.`,
        on_screen_text: `Atau cobain ${pushMenu}`,
        voiceover: `Kalau lagi pengen yang beda rasa, ${pushMenu} juga paling pas buat nemenin lanjut kerja.`,
        camera_note: "Quick whip-pan antar 2 cup",
      },
      {
        scene_no: 4,
        time_range: "15-19 dtk (CTA)",
        visual_action: "Tangan mengangkat cup sambil menembus sedotan, latar belakang booth Teh Poci ramai.",
        on_screen_text: "Tim Ori atau Varian Rasa?",
        voiceover: "Nah kalau kamu tim Ori apa tim varian rasa nih? Mampir ke booth Teh Poci terdekat ya.",
        camera_note: "Eye-level medium shot",
      },
    ];
    parsed = {
      platform: targetPlatform,
      trend_topic: trendLabel,
      post_idea: `[POV Jam 1 Siang] Hook masalah cuaca panas + demo tuang ${heroMenu} + opsi ${pushMenu}.`,
      scenes: fallbackScenes,
      voiceover_script: fallbackScenes.map((s) => s.voiceover).join(" ... "),
      editing_notes:
        "Cut rapat tiap 1.5-2 detik mengikuti beat. Naikkan volume SFX bunyi es batu jatuh & suara tusukan sedotan di Scene 2 & 4. Pakai background lo-fi santai volume -22dB di bawah voiceover.",
      caption_ig: `Jam segini matahari lagi niat banget nyengat. Yang butuh penyelamat dingin sebelum lanjut kerja, ${heroMenu} atau ${pushMenu} udah nunggu di booth.\n\n#EsTehPoci #JajanSore #MinumanSegar #KulinerLokal`,
      caption_tiktok: `jam 1 siang + cuaca gini emang gak ada obat selain yang dingin-dingin. tim ${heroMenu} atau ${pushMenu}? #estehpoci #fypindo #jajanharian`,
      prompt_image_flow: `Candid handheld street photography in Indonesia during bright midday sunlight, close-up of a clear plastic cup of iced jasmine tea (${heroMenu}) with heavy water condensation droplets and crystal ice cubes held in hand in front of a vibrant yellow and red Indonesian tea stall booth, natural shadows, authentic street background slightly blurred, shot on 35mm lens, f/2.8, aspect ratio 4:5`,
      prompt_video_flow: `Vertical 9:16 video, handheld slow push-in shot at an authentic Indonesian street tea stall under bright afternoon sun. Iced tea with crystal clear ice cubes is poured into a plastic cup of Teh Poci, heavy condensation forming immediately on the cup wall. Warm natural daylight, shallow depth of field, ambient sound of ice clinking and quiet street breeze.`,
      negative_prompt:
        "3d render, glossy plastic CGI, western cafe, neon studio lighting, distorted hands, gibberish text, stock photo watermark, oversaturated colors",
      image_search_query: "foto es teh jumbo gelas plastik embun pinggir jalan indonesia",
    };
  }

  const realImages = await searchRealGoogleImages(parsed.image_search_query);
  const googleSearchLink = buildGoogleImagesSearchUrl(parsed.image_search_query);
  const uniqueSources = groundingSources
    .filter((s, idx, arr) => arr.findIndex((x) => x.uri === s.uri) === idx)
    .slice(0, 5);

  const draft = await prisma.socialContentDraft.create({
    data: {
      scheduled_date: todayStr,
      platform: parsed.platform,
      trend_topic: parsed.trend_topic,
      trend_sources_json: JSON.stringify(uniqueSources),
      post_idea: parsed.post_idea,
      scenes_json: JSON.stringify(parsed.scenes),
      voiceover_script: parsed.voiceover_script,
      editing_notes: parsed.editing_notes,
      tts_voice: preferredVoice,
      caption_ig: parsed.caption_ig,
      caption_tiktok: parsed.caption_tiktok,
      prompt_image_flow: parsed.prompt_image_flow,
      prompt_video_flow: parsed.prompt_video_flow,
      negative_prompt: parsed.negative_prompt,
      image_search_query: parsed.image_search_query,
      image_urls_json: JSON.stringify(realImages),
      status: "draft",
      created_by: createdBy,
    },
  });

  // Generate TTS Audio (.wav) jika script tersedia & Gemini API key aktif
  let ttsResult: { wavBuffer: Buffer; audioUrl: string; voiceName: string } | null = null;
  if (parsed.voiceover_script) {
    ttsResult = await synthesizeDraftVoiceover(draft.id, parsed.voiceover_script, preferredVoice).catch(() => null);
  }

  await logAgentEvent({
    agentName: "social_media",
    eventType: "social_draft_created",
    summary: `Draft konten + script ${parsed.platform} dibuat (${parsed.trend_topic.slice(0, 80)})`,
    details: { draftId: draft.id, platform: parsed.platform, hasTtsAudio: Boolean(ttsResult) },
  });

  if (notifyTelegram) {
    const sourceLines =
      uniqueSources.length > 0
        ? uniqueSources.map((s) => `• <a href="${escapeHtml(s.uri)}">${escapeHtml(s.title || s.uri)}</a>`)
        : [`• Tren Google RSS / Konteks POS lokal`];

    const sceneLines = parsed.scenes.map(
      (s) =>
        `<b>Scene ${s.scene_no} [${escapeHtml(s.time_range)}]</b> (${escapeHtml(s.camera_note)})\n` +
        `• Visual: ${escapeHtml(s.visual_action)}\n` +
        `• Teks Layar: <code>${escapeHtml(s.on_screen_text)}</code>\n` +
        `• VO: <i>"${escapeHtml(s.voiceover)}"</i>`
    );

    const imageRefLines =
      realImages.length > 0
        ? realImages.slice(0, 2).map((img) => `• <a href="${escapeHtml(img.imageUrl)}">${escapeHtml(img.title)}</a>`)
        : [];

    const msgPart1 = [
      `📱 <b>Ide Konten + Script Scene-by-Scene (${escapeHtml(todayStr)})</b>`,
      `Platform: <b>${escapeHtml(parsed.platform)}</b> | Status: <i>Draft</i>`,
      ``,
      `🔥 <b>Tren 7 Hari Terakhir:</b> ${escapeHtml(parsed.trend_topic)}`,
      ...sourceLines,
      ``,
      `💡 <b>Konsep &amp; Hook:</b>`,
      escapeHtml(parsed.post_idea),
      ``,
      `🎬 <b>Script Scene-by-Scene:</b>`,
      ...sceneLines,
      ``,
      `✂️ <b>Catatan Editor (CapCut/Reels):</b>`,
      escapeHtml(parsed.editing_notes),
    ].join("\n");

    const msgPart2 = [
      `🎙️ <b>Naskah Voiceover Lengkap (TTS):</b>`,
      `<pre>${escapeHtml(parsed.voiceover_script)}</pre>`,
      ``,
      `✍️ <b>Caption Instagram (siap copy):</b>`,
      `<pre>${escapeHtml(parsed.caption_ig)}</pre>`,
      ``,
      `🎵 <b>Caption TikTok (siap copy):</b>`,
      `<pre>${escapeHtml(parsed.caption_tiktok)}</pre>`,
    ].join("\n");

    const msgPart3 = [
      `🎨 <b>Prompts Siap Paste — Gemini / Google Flow (${escapeHtml(parsed.platform)})</b>`,
      ``,
      `🖼️ <b>Prompt Image (Gemini / Imagen Flow):</b>`,
      `<pre>${escapeHtml(parsed.prompt_image_flow)}</pre>`,
      ``,
      `🎬 <b>Prompt Video 9:16 (Google Flow / Veo):</b>`,
      `<pre>${escapeHtml(parsed.prompt_video_flow)}</pre>`,
      ``,
      `🚫 <b>Negative Prompt:</b>`,
      `<code>${escapeHtml(parsed.negative_prompt)}</code>`,
      ``,
      `🔍 <b>Referensi Real Google Image:</b>`,
      ...imageRefLines,
      `• <a href="${escapeHtml(googleSearchLink)}">Buka Google Images: "${escapeHtml(parsed.image_search_query)}"</a>`,
    ].join("\n");

    await sendMessage(msgPart1);
    await sendMessage(msgPart2);
    await sendMessage(msgPart3);

    if (ttsResult) {
      await sendAudioFile(
        ttsResult.wavBuffer,
        `voiceover-${todayStr}-${draft.id.slice(-5)}.wav`,
        `🎙️ Audio Voiceover TTS (Suara: ${escapeHtml(ttsResult.voiceName)}) — siap dimasukkan ke CapCut / Flow`
      );
    }
  }

  return {
    draft: ttsResult
      ? { ...draft, voiceover_audio_url: ttsResult.audioUrl, tts_voice: ttsResult.voiceName }
      : draft,
    sources: uniqueSources,
    realImages,
    googleSearchLink,
  };
}
