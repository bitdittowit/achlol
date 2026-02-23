import type { FastifyInstance } from "fastify";
import path from "node:path";
import { getStorageAdapter } from "../lib/adapters/index.js";
import { userCanAccessFile } from "../services/fileAccess.js";

const SIGNED_URL_TTL_SEC = 3600;

export async function filesRoutes(app: FastifyInstance) {
  app.get("/api/files/*", async (request, reply) => {
    if (!request.user) return reply.status(401).send({ error: "Unauthorized" });
    const p = (request.params as { "*": string })["*"];
    if (!p || p.includes("..")) return reply.status(400).send({ error: "Invalid path" });
    const relativePath = p.replace(/\\/g, "/");
    const allowed = await userCanAccessFile(request.user.id, relativePath);
    if (!allowed) return reply.status(404).send({ error: "Not found" });
    const adapter = getStorageAdapter();
    const stream = await adapter.getReadStream(relativePath);
    const ext = path.extname(relativePath).toLowerCase();
    const contentType =
      ext === ".png" ? "image/png" : ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" : "application/octet-stream";
    if (stream) {
      return reply.header("Content-Type", contentType).send(stream);
    }
    const signedUrl = await adapter.getSignedUrl(relativePath, SIGNED_URL_TTL_SEC);
    if (!signedUrl) return reply.status(404).send({ error: "Not found" });
    return reply.redirect(signedUrl, 302);
  });
}
