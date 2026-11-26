/**
 * Telegram Bot API Wrapper (Long Polling & HTML Messaging)
 * Fail-closed: tidak akan mengirim atau polling jika TOKEN atau OWNER_CHAT_ID tidak valid.
 */

export interface TelegramConfig {
  token: string;
  ownerChatId: string;
}

export function getTelegramConfig(): TelegramConfig | null {
  const token = (process.env.TELEGRAM_BOT_TOKEN || "").trim();
  const ownerChatId = (process.env.TELEGRAM_OWNER_CHAT_ID || "").trim();

  if (token.length < 10 || !/^-?\d+$/.test(ownerChatId)) {
    return null;
  }

  return { token, ownerChatId };
}

export function escapeHtml(text: string): string {
  return String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function splitTelegramMessage(text: string, maxLen = 3800): string[] {
  if (text.length <= maxLen) return [text];
  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > maxLen) {
    let splitIdx = remaining.lastIndexOf("\n", maxLen);
    if (splitIdx <= 0) splitIdx = maxLen;
    chunks.push(remaining.slice(0, splitIdx));
    remaining = remaining.slice(splitIdx).replace(/^\n+/, "");
  }
  if (remaining.length > 0) {
    chunks.push(remaining);
  }
  return chunks;
}

export async function sendMessage(htmlText: string): Promise<boolean> {
  const cfg = getTelegramConfig();
  if (!cfg) return false;

  const chunks = splitTelegramMessage(htmlText);
  let allOk = true;

  for (const chunk of chunks) {
    try {
      const url = `https://api.telegram.org/bot${cfg.token}/sendMessage`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: cfg.ownerChatId,
          text: chunk,
          parse_mode: "HTML",
        }),
        signal: AbortSignal.timeout(10000),
      });

      if (res.status === 400) {
        // Fallback ke plain text bila ada HTML entity yang ditolak Telegram
        const plain = chunk.replace(/<[^>]+>/g, "");
        const fallbackRes = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: cfg.ownerChatId,
            text: plain,
          }),
          signal: AbortSignal.timeout(10000),
        });
        if (!fallbackRes.ok) allOk = false;
      } else if (!res.ok) {
        allOk = false;
      }
    } catch (err) {
      console.warn("[Telegram] Gagal mengirim pesan:", err);
      allOk = false;
    }
  }

  return allOk;
}

export async function sendWithButtons(
  htmlText: string,
  buttons: Array<{ text: string; callback_data: string }>
): Promise<boolean> {
  const cfg = getTelegramConfig();
  if (!cfg) return false;

  try {
    const url = `https://api.telegram.org/bot${cfg.token}/sendMessage`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: cfg.ownerChatId,
        text: htmlText.slice(0, 3800),
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [buttons],
        },
      }),
      signal: AbortSignal.timeout(10000),
    });
    return res.ok;
  } catch (err) {
    console.warn("[Telegram] Gagal mengirim pesan tombol:", err);
    return false;
  }
}

export async function getUpdates(
  offset: number
): Promise<{ ok: boolean; status: number; result: any[] }> {
  const cfg = getTelegramConfig();
  if (!cfg) return { ok: false, status: 0, result: [] };

  const url = `https://api.telegram.org/bot${cfg.token}/getUpdates?offset=${offset}&timeout=3`;
  const res = await fetch(url, {
    method: "GET",
    signal: AbortSignal.timeout(8000),
  });

  if (!res.ok) {
    return { ok: false, status: res.status, result: [] };
  }

  const data = await res.json();
  return {
    ok: !!data?.ok,
    status: res.status,
    result: Array.isArray(data?.result) ? data.result : [],
  };
}

export async function answerCallbackQuery(
  callbackQueryId: string,
  text?: string
): Promise<void> {
  const cfg = getTelegramConfig();
  if (!cfg) return;

  try {
    await fetch(`https://api.telegram.org/bot${cfg.token}/answerCallbackQuery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        callback_query_id: callbackQueryId,
        text: text || "Diterima",
      }),
      signal: AbortSignal.timeout(5000),
    });
  } catch {}
}
