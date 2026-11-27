import { getGeminiApiKey } from "@/lib/ai-config";
import { AGENT_CONFIG } from "./config";

export interface GeminiGroundingSource {
  title: string;
  uri: string;
}

export interface GeminiRichResponse {
  text: string;
  groundingSources: GeminiGroundingSource[];
}

/**
 * Pemanggilan Google Gemini 2.5 Flash dengan opsi temperature, maxOutputTokens,
 * dan Google Search Grounding untuk riset real-time.
 */
export async function askGeminiRich(params: {
  systemPrompt: string;
  userMessage: string;
  context: string;
  maxOutputTokens?: number;
  temperature?: number;
  useSearchGrounding?: boolean;
  timeoutMs?: number;
}): Promise<GeminiRichResponse | null> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) return null;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const payload: Record<string, any> = {
      systemInstruction: {
        parts: [{ text: params.systemPrompt }],
      },
      contents: [
        {
          role: "user",
          parts: [{ text: `${params.context}\n\nPermintaan/Pesan Owner:\n${params.userMessage}` }],
        },
      ],
      generationConfig: {
        maxOutputTokens: params.maxOutputTokens ?? AGENT_CONFIG.GEMINI_MAX_OUTPUT_TOKENS,
        temperature: params.temperature ?? 0.3,
      },
    };

    if (params.useSearchGrounding) {
      payload.tools = [{ google_search: {} }];
    }

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(params.timeoutMs ?? (params.useSearchGrounding ? 25000 : 15000)),
    });

    if (!res.ok) {
      console.warn(`[Agent:Gemini] HTTP ${res.status}`);
      return null;
    }

    const data = await res.json();
    const candidate = data?.candidates?.[0];
    const parts = Array.isArray(candidate?.content?.parts) ? candidate.content.parts : [];
    const text = parts
      .map((p: any) => (typeof p?.text === "string" ? p.text : ""))
      .join("")
      .trim();

    if (!text) return null;

    const chunks = candidate?.groundingMetadata?.groundingChunks;
    const groundingSources: GeminiGroundingSource[] = Array.isArray(chunks)
      ? chunks
        .map((c: any) => ({
          title: String(c?.web?.title || "").trim(),
          uri: String(c?.web?.uri || "").trim(),
        }))
        .filter((s: GeminiGroundingSource) => Boolean(s.uri))
      : [];

    return { text, groundingSources };
  } catch (err) {
    console.warn("[Agent:Gemini] Error:", err);
    return null;
  }
}

/**
 * Wrapper Google Gemini 2.5 Flash API untuk penalaran agen & pembelajaran perilaku Owner.
 */
export async function askGemini(
  systemPrompt: string,
  userMessage: string,
  context: string,
  maxOutputTokens = AGENT_CONFIG.GEMINI_MAX_OUTPUT_TOKENS
): Promise<string | null> {
  const res = await askGeminiRich({
    systemPrompt,
    userMessage,
    context,
    maxOutputTokens,
    temperature: 0.3,
  });
  return res ? res.text : null;
}

function pcm16ToWav(pcmBuffer: Buffer, sampleRate = 24000, channels = 1, bitsPerSample = 16): Buffer {
  const byteRate = (sampleRate * channels * bitsPerSample) / 8;
  const blockAlign = (channels * bitsPerSample) / 8;
  const header = Buffer.alloc(44);

  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcmBuffer.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16); // Subchunk1Size (16 for PCM)
  header.writeUInt16LE(1, 20); // AudioFormat (1 = PCM)
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write("data", 36);
  header.writeUInt32LE(pcmBuffer.length, 40);

  return Buffer.concat([header, pcmBuffer]);
}

export const GEMINI_TTS_VOICES = ["Kore", "Aoede", "Puck", "Charon", "Fenrir", "Leda"] as const;

/**
 * Generate audio voiceover (.wav) menggunakan Gemini 2.5 Flash Preview TTS.
 */
export async function generateGeminiTTS(
  scriptText: string,
  voiceName = "Kore"
): Promise<{ wavBuffer: Buffer; voiceName: string } | null> {
  const apiKey = getGeminiApiKey();
  const cleanScript = String(scriptText || "").trim();
  if (!apiKey || !cleanScript) return null;

  const selectedVoice = GEMINI_TTS_VOICES.includes(voiceName as any) ? voiceName : "Kore";

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${apiKey}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `Bacakan naskah voiceover video pendek Bahasa Indonesia berikut dengan intonasi santai, natural, artikulasi jelas, dan bertenaga khas konten Instagram Reels/TikTok:\n\n${cleanScript}`,
              },
            ],
          },
        ],
        generationConfig: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: selectedVoice,
              },
            },
          },
        },
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) {
      console.warn(`[Agent:GeminiTTS] HTTP ${res.status}`);
      return null;
    }

    const data = await res.json();
    const inlineData = data?.candidates?.[0]?.content?.parts?.[0]?.inlineData;
    const b64 = inlineData?.data;
    const mime = String(inlineData?.mimeType || "").toLowerCase();

    if (typeof b64 !== "string" || !b64) return null;

    const rawBuf = Buffer.from(b64, "base64");
    if (mime.includes("wav")) {
      return { wavBuffer: rawBuf, voiceName: selectedVoice };
    }

    const rateMatch = mime.match(/rate=(\d+)/);
    const sampleRate = rateMatch ? parseInt(rateMatch[1], 10) || 24000 : 24000;
    const wavBuffer = pcm16ToWav(rawBuf, sampleRate, 1, 16);

    return { wavBuffer, voiceName: selectedVoice };
  } catch (err) {
    console.warn("[Agent:GeminiTTS] Error:", err);
    return null;
  }
}
