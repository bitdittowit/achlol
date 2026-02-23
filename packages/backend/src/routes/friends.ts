import type { FastifyInstance } from "fastify";
import * as friendService from "../services/friendService.js";
import * as prankService from "../services/prankService.js";

export async function friendsRoutes(app: FastifyInstance) {
  app.post("/api/friends/request", async (request, reply) => {
    if (!request.user) return reply.status(401).send({ error: "Unauthorized" });
    const body = request.body as { username?: string };
    const username = typeof body?.username === "string" ? body.username : "";
    try {
      const toUser = await friendService.sendFriendRequest(request.user.id, username);
      return reply.status(201).send({ success: true, toUser: { id: toUser.id, username: toUser.username, firstName: toUser.firstName, lastName: toUser.lastName } });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Ошибка";
      return reply.status(400).send({ error: message });
    }
  });

  app.get("/api/friends/requests", async (request, reply) => {
    if (!request.user) return reply.status(401).send({ error: "Unauthorized" });
    const list = await friendService.getIncomingRequests(request.user.id);
    return reply.send(list.map((r) => ({ id: r.id, fromUser: r.fromUser, createdAt: r.createdAt })));
  });

  app.get("/api/friends/requests/outgoing", async (request, reply) => {
    if (!request.user) return reply.status(401).send({ error: "Unauthorized" });
    const list = await friendService.getOutgoingRequests(request.user.id);
    return reply.send(list.map((r) => ({ id: r.id, toUser: r.toUser, createdAt: r.createdAt })));
  });

  app.post("/api/friends/requests/:id/cancel", async (request, reply) => {
    if (!request.user) return reply.status(401).send({ error: "Unauthorized" });
    const id = Number((request.params as { id: string }).id);
    if (Number.isNaN(id)) return reply.status(400).send({ error: "Invalid id" });
    const req = await friendService.cancelRequest(id, request.user.id);
    if (!req) return reply.status(404).send({ error: "Not found" });
    return reply.send({ success: true });
  });

  app.post("/api/friends/requests/:id/accept", async (request, reply) => {
    if (!request.user) return reply.status(401).send({ error: "Unauthorized" });
    const id = Number((request.params as { id: string }).id);
    if (Number.isNaN(id)) return reply.status(400).send({ error: "Invalid id" });
    const req = await friendService.acceptRequest(id, request.user.id);
    if (!req) return reply.status(404).send({ error: "Not found" });
    return reply.send({ success: true });
  });

  app.post("/api/friends/requests/:id/reject", async (request, reply) => {
    if (!request.user) return reply.status(401).send({ error: "Unauthorized" });
    const id = Number((request.params as { id: string }).id);
    if (Number.isNaN(id)) return reply.status(400).send({ error: "Invalid id" });
    const req = await friendService.rejectRequest(id, request.user.id);
    if (!req) return reply.status(404).send({ error: "Not found" });
    return reply.send({ success: true });
  });

  app.get("/api/friends", async (request, reply) => {
    if (!request.user) return reply.status(401).send({ error: "Unauthorized" });
    const list = await friendService.getFriends(request.user.id);
    return reply.send(list);
  });

  app.get("/api/friends/:userId/pranks", async (request, reply) => {
    if (!request.user) return reply.status(401).send({ error: "Unauthorized" });
    const userId = Number((request.params as { userId: string }).userId);
    if (Number.isNaN(userId)) return reply.status(400).send({ error: "Invalid userId" });
    const areFriends = await friendService.areFriends(request.user.id, userId);
    if (!areFriends) return reply.status(404).send({ error: "Not found" });
    const { prisma } = await import("../lib/db.js");
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, firstName: true, lastName: true },
    });
    if (!user) return reply.status(404).send({ error: "Not found" });
    const pranks = await prankService.listPranks(userId);
    return reply.send({
      user: { id: user.id, username: user.username, firstName: user.firstName, lastName: user.lastName },
      pranks: pranks.map((p) => ({ ...p, confirmed: !!p.confirmedAt })),
    });
  });
}
