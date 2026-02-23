import type { Context } from "telegraf";
import { Markup } from "telegraf";

const WEBAPP_URL = process.env.MINI_APP_URL ?? "https://example.com";

export async function handleStart(ctx: Context) {
  await ctx.reply(
    "Привет! Это Трекер приколов — твой дневник розыгрышей и шалостей.",
    Markup.inlineKeyboard([
      Markup.button.webApp("Открыть приложение", WEBAPP_URL),
    ])
  );
}
