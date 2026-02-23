import type { Context } from "telegraf";

const BACKEND_URL = (process.env.BACKEND_URL ?? "http://localhost:3000").replace(/\/$/, "");
const BOT_SECRET = process.env.BOT_SECRET ?? process.env.TELEGRAM_BOT_TOKEN;

export async function handlePrankConfirmCallback(ctx: Context) {
  const cb = ctx.callbackQuery;
  if (!cb || !("data" in cb) || typeof cb.data !== "string") return;
  const match = cb.data.match(/^prank_(confirm|reject)_(\d+)$/);
  if (!match) return;
  const action = match[1];
  const prankId = parseInt(match[2], 10);
  const telegramId = ctx.from?.id;
  if (!telegramId) {
    await ctx.answerCbQuery("Ошибка").catch(() => {});
    return;
  }
  if (action === "confirm" && BOT_SECRET) {
    try {
      const res = await fetch(`${BACKEND_URL}/api/internal/prank-confirm`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Bot-Secret": BOT_SECRET,
        },
        body: JSON.stringify({ prankId, telegramId }),
      });
      if (!res.ok) {
        await ctx.answerCbQuery("Ошибка").catch(() => {});
        return;
      }
      await ctx.answerCbQuery();
      if ("message" in cb && cb.message && "message_id" in cb.message) {
        await ctx.editMessageText("Подтверждено.").catch(() => {});
      }
      return;
    } catch {
      await ctx.answerCbQuery("Ошибка").catch(() => {});
      return;
    }
  }
  if (action === "reject" && BOT_SECRET) {
    try {
      const res = await fetch(`${BACKEND_URL}/api/internal/prank-reject`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Bot-Secret": BOT_SECRET,
        },
        body: JSON.stringify({ prankId, telegramId }),
      });
      if (!res.ok) {
        await ctx.answerCbQuery("Ошибка").catch(() => {});
        return;
      }
      await ctx.answerCbQuery();
      if ("message" in cb && cb.message && "message_id" in cb.message) {
        await ctx.editMessageText("Отклонено.").catch(() => {});
      }
      return;
    } catch {
      await ctx.answerCbQuery("Ошибка").catch(() => {});
      return;
    }
  }
  await ctx.answerCbQuery();
  if ("message" in cb && cb.message && "message_id" in cb.message) {
    await ctx.editMessageText(action === "reject" ? "Отклонено." : "Подтверждено.").catch(() => {});
  }
}
