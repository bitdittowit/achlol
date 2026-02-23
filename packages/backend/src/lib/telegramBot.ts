const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const API = BOT_TOKEN ? `https://api.telegram.org/bot${BOT_TOKEN}` : "";

export interface InlineButton {
  text: string;
  callback_data: string;
}

export async function sendMessage(
  chatId: string | number,
  text: string,
  inlineKeyboard?: InlineButton[][]
): Promise<boolean> {
  if (!API) return false;
  const numericId = typeof chatId === "string" && /^\d+$/.test(chatId) ? Number(chatId) : chatId;
  const body: Record<string, unknown> = { chat_id: numericId, text };
  if (inlineKeyboard?.length) {
    body.reply_markup = { inline_keyboard: inlineKeyboard };
  }
  const res = await fetch(`${API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    console.error("[telegramBot] sendMessage failed:", res.status, err);
  }
  return res.ok;
}

export async function editMessageText(
  chatId: string,
  messageId: number,
  text: string
): Promise<boolean> {
  if (!API) return false;
  const res = await fetch(`${API}/editMessageText`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      message_id: messageId,
      text,
    }),
  });
  return res.ok;
}

/**
 * Get file_id from Telegram and return file buffer. Uses largest photo size.
 */
export async function downloadTelegramFile(fileId: string): Promise<Buffer> {
  if (!API || !BOT_TOKEN) throw new Error("Telegram bot not configured");
  const getRes = await fetch(`${API}/getFile?file_id=${encodeURIComponent(fileId)}`);
  if (!getRes.ok) throw new Error("getFile failed");
  const data = (await getRes.json()) as { ok?: boolean; result?: { file_path: string } };
  if (!data?.ok || !data.result?.file_path) throw new Error("Invalid getFile response");
  const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${data.result.file_path}`;
  const fileRes = await fetch(fileUrl);
  if (!fileRes.ok) throw new Error("Download file failed");
  const arrayBuffer = await fileRes.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
