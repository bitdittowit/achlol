import type { FastifyInstance } from "fastify";
import path from "node:path";
import fs from "node:fs";
import { fullPath } from "../lib/storage.js";
import { userCanAccessFile } from "../services/fileAccess.js";

export async function filesRoutes(app: FastifyInstance) {
  app.get("/api/files/*", async (request, reply) => {
    if (!request.user) return reply.status(401).send({ error: "Unauthorized" });
    const p = (request.params as { "*": string })["*"];
    if (!p || p.includes("..")) return reply.status(400).send({ error: "Invalid path" });
    const relativePath = p.replace(/\\/g, "/");
    const allowed = await userCanAccessFile(request.user.id, relativePath);
    if (!allowed) return reply.status(404).send({ error: "Not found" });
    let absolute: string;
    try {
      absolute = fullPath(relativePath);
    } catch {
      return reply.status(400).send({ error: "Invalid path" });
    }
    const ext = path.extname(relativePath).toLowerCase();
    const contentType = ext === ".png" ? "image/png" : ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" : "application/octet-stream";
    return reply.header("Content-Type", contentType).send(fs.createReadStream(absolute));
  });
}
