import { escapeHtml, sendMessage } from "@/lib/telegram";
import { AGENT_CONFIG } from "./config";
import { askGeminiRich, GeminiGroundingSource } from "./gemini";
import { logAgentEvent } from "./memory";

export interface GeneratedSocialDraftPayload {
  platform: string;
  trend_topic: string;
  post_idea: string;
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

/**
 * Opsional Real Google Images via Serper.dev jika SERPER_API_KEY diset di .env.
 * Jika tidak diset, tetap mengembalikan link Google Images Search yang siap diklik.
 */
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

  const topMenus = menuPerf.slice(0, 5);
  const slowMenus = [...menuPerf].reverse().slice(0, 4);

  return {
    outlets,
    topMenus,
    slowMenus,
    activeVouchers,
    promoCampaign,
    recentDrafts,
  };
}

function findBannedPhrases(text: string): string[] {
  const lower = text.toLowerCase();
  return BANNED_AI_PHRASES.filter((phrase) => lower.includes(phrase));
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

    return {
      platform: String(obj.platform || "Instagram Reels & TikTok").trim(),
      trend_topic: String(obj.trend_topic || "Tren minuman & cuaca terik Indonesia").trim(),
      post_idea: String(obj.post_idea).trim(),
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

export async function generateAndSendSocialIdea(options?: {
  platformHint?: string;
  customTopic?: string;
  createdBy?: "agent_draft" | "manual_trigger";
  notifyTelegram?: boolean;
}) {
  const { prisma } = await import("@/lib/prisma");
  const todayStr = getWibTodayStr();
  const createdBy = options?.createdBy ?? "agent_draft";
  const notifyTelegram = options?.notifyTelegram ?? true;

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

  const systemPrompt = `Kamu adalah Social Media Strategist khusus UMKM F&B Indonesia untuk brand Es Teh Poci.
TUGAS UTAMA:
1. Gunakan Google Search untuk mencari tren, meme, sound/format viral, atau obrolan netizen Indonesia di Instagram & TikTok yang sedang ramai DALAM 7 HARI TERAKHIR (F&B, cuaca panas, kehidupan pekerja/mahasiswa, humor receh Indonesia).
2. Pilih 1 ide konten yang paling cocok dan natural dihubungkan dengan produk nyata Teh Poci dari data POS.
3. JAMINAN ANTI-AI SLOP (WAJIB DIPATUHI):
   - DILARANG KERAS memakai kalimat klise AI Indonesia: ${BANNED_AI_PHRASES.join(", ")}.
   - Gaya bahasa harus terdengar seperti admin sosmed manusia asli yang paham kultur nongkrong/jajan Indonesia: ringkas, spesifik, observasional, tidak kaku, tidak norak.
   - Maksimal 2-3 emoji per caption. Dilarang spam #hashtag (cukup 4-5 hashtag relevan lokal).
   - Jangan mengarang promo/harga palsu di luar data POS.
4. PROMPT GOOGLE FLOW / GEMINI (READY TO PASTE):
   - prompt_image_flow: Tulis dalam Bahasa Inggris, gaya foto realistis UMKM Indonesia (candid street photography, natural tropical sunlight, clear plastic iced tea cup with realistic condensation and ice cubes, wooden/metal street booth texture, 4:5 or 9:16), BUKAN tampilan 3D render/iklan plastik mengkilap.
   - prompt_video_flow: Tulis dalam Bahasa Inggris khusus untuk Google Flow / Veo 9:16 vertical video (jelaskan gerakan kamera spesifik mis. handheld slow push-in, aksi menuang teh ke es batu, pencahayaan siang terik tropis, serta ambient street/ice clinking sound).
   - negative_prompt: Daftar hal yang dihindari agar hasil Flow tidak tampak seperti AI slop.
   - image_search_query: Kata kunci Google Images bahasa Indonesia untuk mencari referensi foto/meme nyata di Google (jika butuh referensi visual asli).

OUTPUT WAJIB: Kembalikan HANYA 1 objek JSON valid tanpa teks tambahan di luar JSON dengan skema persis ini:
{
  "platform": "Instagram Reels | Instagram Carousel | TikTok",
  "trend_topic": "Ringkasan tren viral 7 hari terakhir yang dipakai",
  "post_idea": "Judul ide + Format + Hook 3 detik pertama + Alur eksekusi singkat",
  "caption_ig": "Caption siap copy untuk Instagram",
  "caption_tiktok": "Caption singkat punchy siap copy untuk TikTok",
  "prompt_image_flow": "Ready-to-paste image prompt in English for Gemini / Google Flow",
  "prompt_video_flow": "Ready-to-paste 9:16 video prompt in English for Google Flow / Veo",
  "negative_prompt": "Negative prompt in English",
  "image_search_query": "query pencarian Google Images"
}`;

  const userPrompt = options?.customTopic
    ? `Buatkan 1 ide konten ${targetPlatform} dengan arahan topik dari Owner: "${options.customTopic}". Tetap kaitkan dengan tren 7 hari terakhir & bebas AI slop.`
    : `Carikan 1 tren viral Indonesia 7 hari terakhir dan buatkan paket konten lengkap siap eksekusi untuk ${targetPlatform} hari ini.`;

  let groundingSources: GeminiGroundingSource[] = [];
  let parsed: GeneratedSocialDraftPayload | null = null;

  const firstAttempt = await askGeminiRich({
    systemPrompt,
    userMessage: userPrompt,
    context: posContextText,
    maxOutputTokens: AGENT_CONFIG.SOCIAL_MAX_OUTPUT_TOKENS,
    temperature: 0.75,
    useSearchGrounding: true,
    timeoutMs: 28000,
  });

  if (firstAttempt) {
    groundingSources = firstAttempt.groundingSources;
    parsed = parseSocialJson(firstAttempt.text);
  }

  // Self-critique Anti-AI Slop pass jika ditemukan frasa klise AI
  if (parsed) {
    const slopFound = findBannedPhrases(
      `${parsed.post_idea}\n${parsed.caption_ig}\n${parsed.caption_tiktok}`
    );
    if (slopFound.length > 0) {
      const critique = await askGeminiRich({
        systemPrompt:
          "Kamu adalah Editor Konten Anti-AI-Slop. Tugasmu merevisi JSON konten agar terdengar 100% natural ditulis manusia Indonesia, tanpa klise marketing AI. Kembalikan JSON dengan skema persis sama.",
        userMessage: `Revisi JSON berikut karena masih mengandung frasa klise AI (${slopFound.join(", ")}). Buat lebih natural, membumi, dan spesifik:\n${JSON.stringify(parsed)}`,
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
    parsed = {
      platform: targetPlatform,
      trend_topic: trendLabel,
      post_idea: `[POV Jam 1 Siang] Hook: "Jam 12 lewat, kepala mulai ngebul — obatnya cuma satu." Tunjukkan proses menuang ${heroMenu} dingin dengan es batu penuh di booth Teh Poci, lalu selipkan ajakan cobain ${pushMenu}.`,
      caption_ig: `Jam segini matahari lagi niat banget nyengat. Yang butuh penyelamat dingin sebelum lanjut kerja, ${heroMenu} atau ${pushMenu} udah nunggu di booth.\n\n#EsTehPoci #JajanSore #MinumanSegar #KulinerLokal`,
      caption_tiktok: `jam 1 siang + cuaca gini emang gak ada obat selain yang dingin-dingin. tim ${heroMenu} atau ${pushMenu}? #estehpoci #fypindo #jajanharian`,
      prompt_image_flow: `Candid handheld street photography in Indonesia during bright midday sunlight, close-up of a clear plastic cup of iced jasmine tea (${heroMenu}) with heavy water condensation droplets and crystal ice cubes held in hand in front of a vibrant yellow and red Indonesian tea stall booth, natural shadows, authentic street background slightly blurred, shot on 35mm lens, f/2.8, aspect ratio 4:5`,
      prompt_video_flow: `Vertical 9:16 video, handheld slow push-in shot at an authentic Indonesian street tea stall under bright afternoon sun. Iced tea with crystal clear ice cubes is poured into a plastic cup of Teh Poci, heavy condensation forming immediately on the cup wall. Warm natural daylight, shallow depth of field, ambient sound of ice clinking and quiet street breeze.`,
      negative_prompt:
        "3d render, glossy plastic CGI, western cafe, neon studio lighting, distorted hands, gibberish text, stock photo watermark, oversaturated colors",
      image_search_query: "foto es teh jumbo gelas plastik embun pinggir jalan indonesia",
    };
  }

  // Lookup Real Google Images jika SERPER_API_KEY diset
  const realImages = await searchRealGoogleImages(parsed.image_search_query);
  const googleSearchLink = buildGoogleImagesSearchUrl(parsed.image_search_query);

  const uniqueSources = groundingSources.filter(
    (s, idx, arr) => arr.findIndex((x) => x.uri === s.uri) === idx
  ).slice(0, 5);

  const draft = await prisma.socialContentDraft.create({
    data: {
      scheduled_date: todayStr,
      platform: parsed.platform,
      trend_topic: parsed.trend_topic,
      trend_sources_json: JSON.stringify(uniqueSources),
      post_idea: parsed.post_idea,
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

  await logAgentEvent({
    agentName: "social_media",
    eventType: "social_draft_created",
    summary: `Draft konten ${parsed.platform} dibuat (${parsed.trend_topic.slice(0, 80)})`,
    details: { draftId: draft.id, platform: parsed.platform },
  });

  if (notifyTelegram) {
    const sourceLines =
      uniqueSources.length > 0
        ? uniqueSources.map((s) => `• <a href="${escapeHtml(s.uri)}">${escapeHtml(s.title || s.uri)}</a>`)
        : [`• Tren Google RSS / Konteks POS lokal`];

    const imageRefLines =
      realImages.length > 0
        ? realImages.slice(0, 2).map((img) => `• <a href="${escapeHtml(img.imageUrl)}">${escapeHtml(img.title)}</a>`)
        : [];

    const msgPart1 = [
      `📱 <b>Ide Konten Sosmed Hari Ini (${escapeHtml(todayStr)})</b>`,
      `Platform: <b>${escapeHtml(parsed.platform)}</b> | Status: <i>Draft (Belum Diposting)</i>`,
      ``,
      `🔥 <b>Tren 7 Hari Terakhir:</b> ${escapeHtml(parsed.trend_topic)}`,
      ...sourceLines,
      ``,
      `💡 <b>Ide Post &amp; Hook:</b>`,
      escapeHtml(parsed.post_idea),
      ``,
      `✍️ <b>Caption Instagram (siap copy):</b>`,
      `<pre>${escapeHtml(parsed.caption_ig)}</pre>`,
      ``,
      `🎵 <b>Caption TikTok (siap copy):</b>`,
      `<pre>${escapeHtml(parsed.caption_tiktok)}</pre>`,
    ].join("\n");

    const msgPart2 = [
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
  }

  return {
    draft,
    sources: uniqueSources,
    realImages,
    googleSearchLink,
  };
}
