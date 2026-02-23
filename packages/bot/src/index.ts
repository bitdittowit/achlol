import { readFileSync, existsSync, appendFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
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

// Пути к .tunnel-url: cwd (при npm run dev из корня cwd = корень репо) и от файла
const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRootFromFile = join(__dirname, "..", "..", "..");
const tunnelUrlPaths = [
  join(process.cwd(), ".tunnel-url"),
  join(repoRootFromFile, ".tunnel-url"),
];

const logFile = join(dirname(tunnelUrlPaths[0]), ".bot-menu.log");
function botLog(msg: string): void {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  try {
    appendFileSync(logFile, line);
  } catch {
    /* ignore */
  }
  console.error("[Bot] " + msg);
}

function getWebAppUrl(): { url: string; path: string } | null {
  for (const p of tunnelUrlPaths) {
    if (existsSync(p)) {
      try {
        const url = readFileSync(p, "utf8").trim();
        if (url.startsWith("https://")) return { url, path: p };
      } catch {
        /* ignore */
      }
    }
  }
  const fromEnv = process.env.MINI_APP_URL?.trim();
  if (fromEnv?.startsWith("https://")) return { url: fromEnv, path: "MINI_APP_URL" };
  return null;
}

async function setMenuButton(url: string): Promise<void> {
  await bot.telegram.setChatMenuButton({
    menuButton: {
      type: "web_app",
      text: "Открыть приложение",
      web_app: { url },
    },
  });
  botLog("Кнопка «Открыть приложение» → " + url);
}

const bot = new Telegraf(token);

bot.start(handleStart);
bot.on("photo", handlePhoto);
bot.action(/^fr_(accept|reject)_(\d+)$/, handleFriendRequestCallback);
bot.action(/^prank_(confirm|reject)_(\d+)$/, handlePrankConfirmCallback);

async function applyMenuButton(): Promise<void> {
  botLog("Ищу .tunnel-url: " + tunnelUrlPaths.map((p) => p + "=" + existsSync(p)).join("; "));
  const result = getWebAppUrl();
  if (result) {
    await setMenuButton(result.url);
    botLog("URL взят из: " + result.path);
  } else {
    botLog("MINI_APP_URL / .tunnel-url не задан.");
  }
}

// Резерв: через 5 и 20 с применить кнопку (на случай если launch().then не срабатывает под concurrently)
setTimeout(() => applyMenuButton().catch((e) => botLog("Ошибка (5 с): " + String(e))), 5_000);
setTimeout(() => applyMenuButton().catch((e) => botLog("Ошибка (20 с): " + String(e))), 20_000);

bot.launch().then(async () => {
  botLog("Launch завершён.");
  try {
    await applyMenuButton();
    setTimeout(() => applyMenuButton().catch((e) => botLog("Ошибка (15 с): " + String(e))), 15_000);
  } catch (e) {
    botLog("Ошибка при установке кнопки: " + String(e));
  }
}).catch((err) => {
  botLog("Ошибка launch: " + String(err));
});

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
