import { getGeminiApiKey } from "@/lib/ai-config";
import { AGENT_CONFIG } from "./config";

/**
 * Wrapper Google Gemini 2.5 Flash API untuk penalaran agen & pembelajaran perilaku Owner.
 */
export async function askGemini(
  systemPrompt: string,
  userMessage: string,
  context: string,
  maxOutputTokens = AGENT_CONFIG.GEMINI_MAX_OUTPUT_TOKENS
): Promise<string | null> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) return null;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: systemPrompt }],
        },
        contents: [
          {
            role: "user",
            parts: [{ text: `${context}\n\nPermintaan/Pesan Owner:\n${userMessage}` }],
          },
        ],
        generationConfig: {
          maxOutputTokens,
          temperature: 0.3,
        },
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      console.warn(`[Agent:Gemini] HTTP ${res.status}`);
      return null;
    }

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    return typeof text === "string" && text.trim().length > 0 ? text.trim() : null;
  } catch (err) {
    console.warn("[Agent:Gemini] Error:", err);
    return null;
  }
}
