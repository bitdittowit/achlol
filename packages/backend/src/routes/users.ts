import type { FastifyInstance } from "fastify";

export async function usersRoutes(app: FastifyInstance) {
  app.post("/api/users/me", async (request, reply) => {
    if (!request.user) {
      return reply.status(401).send({ error: "Unauthorized" });
    }
    return reply.send({
      id: request.user.id,
      telegramId: request.user.telegramId,
    });
  });
}
