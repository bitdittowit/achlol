import type { Context } from "telegraf";
import { Markup } from "telegraf";

const BACKEND_URL = (process.env.BACKEND_URL ?? "http://localhost:3000").replace(/\/$/, "");
const BOT_SECRET = process.env.BOT_SECRET ?? process.env.TELEGRAM_BOT_TOKEN;
const WEBAPP_URL = process.env.MINI_APP_URL ?? "https://example.com";

export async function handlePhoto(ctx: Context) {
  const msg = ctx.message;
  if (!msg || !("photo" in msg) || !Array.isArray(msg.photo) || msg.photo.length === 0) return;
  const largest = msg.photo[msg.photo.length - 1];
  const fileId = "file_id" in largest ? String(largest.file_id) : "";
  if (!fileId || !BOT_SECRET) {
    await ctx.reply("Не удалось создать прикол. Попробуйте позже.").catch(() => {});
    return;
  }
  const caption = "caption" in msg && typeof msg.caption === "string" ? msg.caption : undefined;
  const from = ctx.from;
  if (!from || from.id == null) {
    await ctx.reply("Не удалось определить пользователя.").catch(() => {});
    return;
  }
  const telegramId = from.id;
  try {
    const res = await fetch(`${BACKEND_URL}/api/internal/pranks/quick`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Bot-Secret": BOT_SECRET,
      },
      body: JSON.stringify({
        fileId,
        caption: caption ?? null,
        telegramId,
        firstName: from.first_name ?? null,
        lastName: from.last_name ?? null,
        username: from.username ?? null,
      }),
    });
    const data = (await res.json()) as { success?: boolean; title?: string; error?: string };
    if (!res.ok) {
      const err = data?.error ?? "Ошибка создания прикола";
      await ctx.reply(err).catch(() => {});
      return;
    }
    const title = data?.title ?? "Прикол";
    await ctx.reply(
      `Прикол «${title}» создан. Открыть в приложении?`,
      Markup.inlineKeyboard([Markup.button.webApp("Открыть приложение", WEBAPP_URL)])
    ).catch(() => {});
  } catch {
    await ctx.reply("Ошибка связи с сервером. Попробуйте позже.").catch(() => {});
  }
}
