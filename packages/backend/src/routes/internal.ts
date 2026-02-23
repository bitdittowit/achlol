import type { FastifyInstance } from "fastify";
import { prisma } from "../lib/db.js";
import * as friendService from "../services/friendService.js";
import * as prankService from "../services/prankService.js";
import * as userService from "../services/userService.js";

const BOT_SECRET = process.env.BOT_SECRET ?? process.env.TELEGRAM_BOT_TOKEN;

export async function internalRoutes(app: FastifyInstance) {
  app.addHook("preHandler", async (request, reply) => {
    const secret = request.headers["x-bot-secret"];
    if (!BOT_SECRET || secret !== BOT_SECRET) {
      return reply.status(401).send({ error: "Unauthorized" });
    }
  });

  app.post("/api/internal/friend-request/respond", async (request, reply) => {
    const body = request.body as { requestId?: number; action?: string; telegramId?: number };
    const requestId = Number(body?.requestId);
    const action = body?.action;
    const telegramId = body?.telegramId;
    if (Number.isNaN(requestId) || !action || typeof telegramId !== "number") {
      return reply.status(400).send({ error: "Invalid body" });
    }
    const user = await prisma.user.findFirst({ where: { telegramId: String(telegramId) } });
    if (!user) return reply.status(404).send({ error: "User not found" });
    if (action === "accept") {
      const req = await friendService.acceptRequest(requestId, user.id);
      if (!req) return reply.status(404).send({ error: "Request not found" });
      return reply.send({ success: true, message: "accepted" });
    }
    if (action === "reject") {
      const req = await friendService.rejectRequest(requestId, user.id);
      if (!req) return reply.status(404).send({ error: "Request not found" });
      return reply.send({ success: true, message: "rejected" });
    }
    return reply.status(400).send({ error: "Invalid action" });
  });

  app.post("/api/internal/prank-confirm", async (request, reply) => {
    const body = request.body as { prankId?: number; telegramId?: number };
    const prankId = Number(body?.prankId);
    const telegramId = body?.telegramId;
    if (Number.isNaN(prankId) || typeof telegramId !== "number") {
      return reply.status(400).send({ error: "Invalid body" });
    }
    const user = await prisma.user.findFirst({ where: { telegramId: String(telegramId) } });
    if (!user) return reply.status(404).send({ error: "User not found" });
    const prank = await prankService.confirmPrankByWitness(prankId, user.id);
    if (!prank) return reply.status(404).send({ error: "Not found" });
    return reply.send({ success: true });
  });

  app.post("/api/internal/pranks/quick", async (request, reply) => {
    const body = request.body as {
      fileId?: string;
      caption?: string | null;
      telegramId?: number;
      firstName?: string | null;
      lastName?: string | null;
      username?: string | null;
    };
    const fileId = body?.fileId;
    const telegramId = body?.telegramId;
    if (typeof fileId !== "string" || fileId.length === 0 || typeof telegramId !== "number") {
      return reply.status(400).send({ error: "Invalid body: fileId and telegramId required" });
    }
    const user = await userService.findOrCreateUserFromBot(String(telegramId), {
      firstName: body.firstName ?? null,
      lastName: body.lastName ?? null,
      username: body.username ?? null,
    });
    try {
      const result = await prankService.createQuickPrankFromBot(user.id, fileId, body.caption);
      return reply.send({ success: true, title: result.title, prankId: result.id });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("лимит")) return reply.status(403).send({ error: msg });
      throw err;
    }
  });
}
