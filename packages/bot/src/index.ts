import { Telegraf } from "telegraf";
import { handleStart } from "./handlers/start.js";
import { handleFriendRequestCallback } from "./handlers/friendRequest.js";
import { handlePrankConfirmCallback } from "./handlers/prankConfirm.js";
import { handlePhoto } from "./handlers/quickPrank.js";

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
bot.on("photo", handlePhoto);
bot.action(/^fr_(accept|reject)_(\d+)$/, handleFriendRequestCallback);
bot.action(/^prank_(confirm|reject)_(\d+)$/, handlePrankConfirmCallback);

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
