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
