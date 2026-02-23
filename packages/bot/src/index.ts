import { Telegraf } from "telegraf";
import { handleStart } from "./handlers/start.js";

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  console.error("TELEGRAM_BOT_TOKEN is required");
  process.exit(1);
}

const webAppUrl = process.env.MINI_APP_URL;
if (!webAppUrl) {
  console.warn("MINI_APP_URL is not set; Web App button will point to example.com");
}

const bot = new Telegraf(token);

bot.start(handleStart);

bot.launch().then(async () => {
  if (webAppUrl) {
    await bot.telegram.setChatMenuButton({
      menuButton: {
        type: "web_app",
        text: "Открыть приложение",
        web_app: { url: webAppUrl },
      },
    });
  }
});

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
