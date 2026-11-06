import { NextResponse } from "next/server";

// Cache in-memory: key per outlet, valid selama 15 menit
interface CacheItem {
  pantun: string;
  createdAt: number;
}
const pantunCache: Record<string, CacheItem> = {};
const CACHE_DURATION_MS = 15 * 60 * 1000; // 15 Menit

// Pool Pantun Berima Lucu Khusus Teh Cap Poci (Fallback Cerdas jika Gemini Key kosong / offline)
const FALLBACK_PANTUNS_ONGOING = [
  "Makan bakso kuahnya pedas,\nEs batu kristal dinginnya pas!\nTinggal {remaining} cup kerja cerdas,\nRezeki berkah mengalir deras! 🧊🔥",
  "Beli mangga di pasar Minggu,\nEs Teh Poci segar sudah menunggu!\nKurang {remaining} cup jangan ragu,\nTarget tembus bos senyum melulu! 🧋😁",
  "Burung dara terbang melayang,\nSinggah sebentar di dahan kedondong.\n{remaining} cup lagi dompet kenyang,\nAyo kak senyum manisnya dong! ✨😉",
  "Pergi ke Malioboro beli bakpia,\nMampir sebentar beli melati.\nLayani pelanggan dengan ceria,\n{remaining} cup lagi beres hari ini! 🌺🏃",
  "Buah naga buah markisa,\nEs teh dingin pelepas dahaga.\nKurang {remaining} cup pasti bisa,\nSemangat pejuang rupiah keluarga! 🦸‍♂️💪",
  "Goreng tahu campur terasi,\nJangan lupa taburi wijen.\nSegarnya segelas Teh Cap Poci,\n{remaining} cup lagi target paten! 🚀🤑",
  "Ada kancil minum selasih,\nMinumnya di bawah jembatan layang.\nTinggal {remaining} cup jangan bersedih,\nMalam nanti tidur pun tenang! 🌈🥤",
  "Ikan sepat ikan gabus,\nDinginnya es teh tiada tanding.\nKurang {remaining} cup target ditembus,\nKerja keras tak sia-sia dibanding! 🐟✨",
  "Pagi-pagi jalan ke sawah,\nLihat mentari bersinar cerah.\nTinggal {remaining} cup jangan lelah,\nSenyum manis bikin pelanggan ramah! ☀️🍃",
  "Beli garam beli merica,\nBungkus rapi dengan kertas koran.\n{remaining} cup lagi ayo dicoba,\nBonus harian siap dicairkan! 💸🎉",
  "Naik delman ke kota Blitar,\nKudanya lari sangat lincah.\nTangan lincah mengocok shaker,\nSisa {remaining} cup langsung tumpah! 🏎️💨",
  "Buah duku buah delima,\nMinum es teh di teras depan.\nKurang {remaining} cup kita terima,\nRezeki halal penuh harapan! 🍉🥰",
  "Makan pecel lauknya tempe,\nJangan lupa kerupuk udang.\n{remaining} cup lagi tinggal sepele,\nCapek hilang hati pun senang! 🥗🙌",
  "Pergi belanja ke Pasar Baru,\nBeli baju warna kelabu.\nJangan loyo bestie-ku yang seru,\n{remaining} cup lagi gaskeun melaju! 🛵💨",
  "Batu giok dari Palembang,\nAir jernih di dalam kendi.\n{remaining} cup lagi hati berbunga-bunga,\nKasir handal kebanggaan Poci! 💎🥤",
  "Pohon randu daunnya lebat,\nKucing tidur di atas karpet.\nCrew Teh Poci memang hebat,\n{remaining} cup lagi omset melejit cepat! 🐱🚀",
  "Jalan-jalan ke kota Medan,\nBeli durian manis rasanya.\nJangan mager jangan rebahan,\nSisa {remaining} cup kita sapu rata! 🥭🔥",
];

const FALLBACK_PANTUNS_REACHED = [
  "Pergi ke pesta memakai dasi,\nPulangnya bawa sekarung roti.\nTarget tercapai Teh Cap Poci,\nMantap tim hebat tak tertandingi! 🎉🏆",
  "Bunga mawar harum baunya,\nDisiram air di pagi hari.\nTarget tembus kita juaranya,\nTerima kasih tim kerja rapi! 👑🌟",
  "Jalan-jalan keliling kota,\nSinggah sejenak membeli blewah.\nTarget cup jebol sesuai cita-cita,\nAlhamdulillah rezeki melimpah! 🥳💰",
  "Burung merak bulunya indah,\nHinggap santai di pohon beringin.\nTarget tuntas hati pun lega,\nPulang shift dengan senyum manis dingin! 🍃✨",
];

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const outletName = searchParams.get("outletName") || "Kedai Teh Poci";
    const target = Number(searchParams.get("target")) || 100;
    const sold = Number(searchParams.get("sold")) || 0;
    const isTargetReached = sold >= target;
    const remaining = Math.max(0, target - sold);
    const force = searchParams.get("refresh") === "true";

    const cacheKey = `${outletName}_${target}_${isTargetReached ? "reached" : "ongoing"}`;
    const now = Date.now();

    // 1. Cek Cache 15 Menit (jika bukan paksaan refresh dari user)
    if (!force && pantunCache[cacheKey] && now - pantunCache[cacheKey].createdAt < CACHE_DURATION_MS) {
      return NextResponse.json({
        pantun: pantunCache[cacheKey].pantun,
        source: "cache",
        cachedAt: pantunCache[cacheKey].createdAt,
        expiresInSeconds: Math.round((CACHE_DURATION_MS - (now - pantunCache[cacheKey].createdAt)) / 1000),
      });
    }

    // 2. Generate dengan Google Gemini API
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    let generatedPantun: string | null = null;

    if (apiKey && apiKey.trim().length > 5) {
      try {
        const prompt = isTargetReached
          ? `Buatkan 1 bait pantun jenaka berima 2 baris (AA) atau 4 baris (ABAB) bahasa Indonesia untuk merayakan keberhasilan karyawan booth es teh "Teh Cap Poci" di "${outletName}" karena TARGET HARI INI TERCAPAI (${sold} cup terjual dari target ${target} cup). Harus lucu, ceria, berima sempurna, dan sebutkan kata gembira/bonus/istirahat. Berikan HANYA teks pantunnya saja dengan 1-2 emoji di akhir baris, tanpa tanda kutip, tanpa kata pengantar.`
          : `Buatkan 1 bait pantun jenaka berima 2 baris (AA) atau 4 baris (ABAB) bahasa Indonesia untuk menyemangati karyawan booth es teh "Teh Cap Poci" di "${outletName}". Konteks operasional: Target harian ${target} cup, sudah terjual ${sold} cup, SISA ${remaining} CUP LAGI yang harus dijual hari ini. Pantun harus lucu, berima jelas antar baris (a-a atau a-b-a-b), berhubungan dengan es teh poci, es batu kristal, cup sealer, senyum manis melayani pembeli, dan mengejar sisa ${remaining} cup lagi. Berikan HANYA teks pantunnya saja dengan 1-2 emoji di akhir, tanpa tanda kutip, tanpa kalimat pembuka atau penutup.`;

        const models = ["gemini-2.0-flash", "gemini-1.5-flash"];
        for (const model of models) {
          try {
            const geminiRes = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey.trim()}`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  contents: [{ parts: [{ text: prompt }] }],
                  generationConfig: {
                    temperature: 0.95,
                    maxOutputTokens: 150,
                  },
                }),
              }
            );

            if (geminiRes.ok) {
              const geminiData = await geminiRes.json();
              const text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
              if (text) {
                // Bersihkan kutipan atau intro jika ada
                generatedPantun = text
                  .replace(/^["'“]|["'”]$/g, "")
                  .replace(/^(ini pantunnya|pantun untukmu):?\s*/i, "")
                  .trim();
                break;
              }
            } else {
              const errBody = await geminiRes.text();
              console.warn(`Gemini API (${model}) response status ${geminiRes.status}:`, errBody);
            }
          } catch (modelErr) {
            console.warn(`Error connecting to ${model}:`, modelErr);
          }
        }
      } catch (geminiError) {
        console.error("Gemini API call failed:", geminiError);
      }
    }

    // 3. Fallback Pantun Berima jika API Key belum diset atau panggilan gagal
    if (!generatedPantun) {
      const list = isTargetReached ? FALLBACK_PANTUNS_REACHED : FALLBACK_PANTUNS_ONGOING;
      const raw = list[Math.floor(Math.random() * list.length)];
      generatedPantun = raw.replace(/\{remaining\}/g, String(remaining)).replace(/\{target\}/g, String(target));
    }

    // Simpan ke Cache 15 menit
    pantunCache[cacheKey] = {
      pantun: generatedPantun,
      createdAt: now,
    };

    return NextResponse.json({
      pantun: generatedPantun,
      source: apiKey ? "gemini" : "fallback",
      cachedAt: now,
      expiresInSeconds: Math.round(CACHE_DURATION_MS / 1000),
    });
  } catch (error) {
    console.error("Gagal memproses pantun:", error);
    return NextResponse.json(
      {
        pantun: "Makan bakso kuahnya pedas,\nEs Teh Poci dinginnya pas!\nTinggal beberapa cup kerja cerdas,\nRezeki berkah mengalir deras! 🧊🔥",
        source: "fallback",
      },
      { status: 200 }
    );
  }
}

