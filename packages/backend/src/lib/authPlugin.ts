import type { FastifyRequest, FastifyReply } from "fastify";
import { API_HEADER_TELEGRAM_INIT_DATA } from "@prankster/shared";
import { validateTelegramInitData } from "./telegramAuth.js";
import { findOrCreateUser } from "../services/userService.js";

export interface AuthUser {
  id: number;
  telegramId: string;
}

declare module "fastify" {
  interface FastifyRequest {
    user: AuthUser | null;
  }
}

export async function authMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const initData = request.headers[API_HEADER_TELEGRAM_INIT_DATA] as string | undefined;
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!initData || !botToken) {
    request.user = null;
    return;
  }
  const tgUser = validateTelegramInitData(initData, botToken);
  if (!tgUser) {
    request.user = null;
    return;
  }
  const user = await findOrCreateUser(tgUser);
  request.user = { id: user.id, telegramId: user.telegramId };
}

export function requireAuth(
  request: FastifyRequest,
  reply: FastifyReply,
  done: () => void
): void {
  if (!request.user) {
    reply.status(401).send({ error: "Unauthorized" });
    return;
  }
  done();
}
