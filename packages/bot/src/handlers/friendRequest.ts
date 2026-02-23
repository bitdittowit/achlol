import type { Context } from "telegraf";

const BACKEND_URL = (process.env.BACKEND_URL ?? "http://localhost:3000").replace(/\/$/, "");
const BOT_SECRET = process.env.BOT_SECRET ?? process.env.TELEGRAM_BOT_TOKEN;

export async function handleFriendRequestCallback(ctx: Context) {
  const cb = ctx.callbackQuery;
  if (!cb || !("data" in cb) || typeof cb.data !== "string") return;
  const match = cb.data.match(/^fr_(accept|reject)_(\d+)$/);
  if (!match) return;
  const action = match[1] as "accept" | "reject";
  const requestId = parseInt(match[2], 10);
  const telegramId = ctx.from?.id;
  if (!telegramId || !BOT_SECRET) {
    await ctx.answerCbQuery("Ошибка").catch(() => {});
    return;
  }
  try {
    const res = await fetch(`${BACKEND_URL}/api/internal/friend-request/respond`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Bot-Secret": BOT_SECRET,
      },
      body: JSON.stringify({ requestId, action, telegramId }),
    });
    if (!res.ok) {
      await ctx.answerCbQuery("Ошибка").catch(() => {});
      return;
    }
    await ctx.answerCbQuery();
    const text = action === "accept" ? "Вы теперь друзья!" : "Заявка отклонена";
    if ("message" in cb && cb.message && "message_id" in cb.message) {
      await ctx.editMessageText(text).catch(() => {});
    }
  } catch {
    await ctx.answerCbQuery("Ошибка").catch(() => {});
  }
}
