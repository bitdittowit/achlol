import Fastify from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import { authMiddleware } from "./lib/authPlugin.js";
import { ensureUploadsDir } from "./lib/storage.js";
import { usersRoutes } from "./routes/users.js";
import { pranksRoutes } from "./routes/pranks.js";
import { filesRoutes } from "./routes/files.js";

const app = Fastify({ logger: true });

await app.register(cors, { origin: true });
await app.register(multipart, { limits: { fileSize: 10 * 1024 * 1024 } });

app.addHook("preHandler", authMiddleware);

app.get("/health", async () => ({ ok: true }));

await app.register(usersRoutes);
await app.register(pranksRoutes);
await app.register(filesRoutes);

await ensureUploadsDir();

const host = process.env.HOST ?? "0.0.0.0";
const port = Number(process.env.PORT ?? 3000);

try {
  await app.listen({ host, port });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
