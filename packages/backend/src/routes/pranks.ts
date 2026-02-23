import type { FastifyInstance } from "fastify";
import {
  createPrankBodySchema,
  updatePrankBodySchema,
  prankListQuerySchema,
} from "@prankster/shared";
import * as prankService from "../services/prankService.js";
import * as iconService from "../services/iconService.js";
import { mediaRelativePath, uniqueFilename } from "../lib/storage.js";
import { getStorageAdapter } from "../lib/adapters/index.js";
import { compressMediaImage } from "../lib/compressMedia.js";

export async function pranksRoutes(app: FastifyInstance) {
  app.get("/api/pranks", async (request, reply) => {
    if (!request.user) return reply.status(401).send({ error: "Unauthorized" });
    const parsed = prankListQuerySchema.safeParse(request.query);
    const query = parsed.success ? parsed.data : undefined;
    const list = await prankService.listPranks(request.user.id, query);
    return reply.send(list.map((p) => ({ ...p, confirmed: !!p.confirmedAt, witnessRejected: !!p.witnessRejectedAt })));
  });

  app.get("/api/pranks/active-count", async (request, reply) => {
    if (!request.user) return reply.status(401).send({ error: "Unauthorized" });
    const count = await prankService.countActivePranks(request.user.id);
    return reply.send({ count });
  });

  app.get("/api/feed", async (request, reply) => {
    if (!request.user) return reply.status(401).send({ error: "Unauthorized" });
    const list = await prankService.getFeedPranks(request.user.id);
    return reply.send(
      list.map((p) => ({
        ...p,
        author: p.user,
        confirmed: !!p.confirmedAt,
        witnessRejected: !!p.witnessRejectedAt,
        user: undefined,
      }))
    );
  });

  app.post("/api/pranks", async (request, reply) => {
    if (!request.user) return reply.status(401).send({ error: "Unauthorized" });

    let body: Record<string, unknown>;
    let iconPath: string | null = null;
    let mediaPath: string | null = null;

    if (request.isMultipart()) {
      const parts = request.parts();
      const fields: Record<string, string> = {};
      for await (const part of parts) {
        if (part.type === "field") {
          const p = part as { fieldname: string; value: string };
          fields[p.fieldname] = p.value;
        } else if (part.type === "file") {
          const p = part as { fieldname: string; file: AsyncIterable<Buffer>; mimetype: string };
          const chunks: Buffer[] = [];
          for await (const chunk of p.file) chunks.push(chunk);
          const buffer = Buffer.concat(chunks);
          if (p.fieldname === "icon") {
            iconPath = await iconService.processUploadedIcon(buffer, p.mimetype);
          } else if (p.fieldname === "photo") {
            const { buffer: compressed, ext } = await compressMediaImage(buffer, p.mimetype);
            const filename = uniqueFilename(ext);
            mediaPath = mediaRelativePath(filename);
            const contentType = ext === ".png" ? "image/png" : "image/jpeg";
            await getStorageAdapter().upload(mediaPath, compressed, contentType);
          }
        }
      }
      body = {
        title: fields.title,
        description: fields.description ?? null,
        iconType: fields.iconType ?? "auto",
        participants: fields.participants,
        scheduledAt: fields.scheduledAt || null,
        witnessUserId: fields.witnessUserId ? Number(fields.witnessUserId) : null,
      };
    } else {
      body = (await request.body) as Record<string, unknown>;
    }

    const parsed = createPrankBodySchema.safeParse(body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Validation failed", details: parsed.error.flatten() });
    }
    try {
      const prank = await prankService.createPrank(
        request.user.id,
        parsed.data,
        iconPath,
        mediaPath
      );
      if (!prank) return reply.status(500).send({ error: "Failed to create prank" });
      return reply.status(201).send({ ...prank, confirmed: !!prank.confirmedAt, witnessRejected: !!prank.witnessRejectedAt });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Limit exceeded";
      if (message.includes("лимит")) {
        return reply.status(403).send({ error: message });
      }
      throw err;
    }
  });

  app.get("/api/pranks/:id", async (request, reply) => {
    if (!request.user) return reply.status(401).send({ error: "Unauthorized" });
    const id = Number((request.params as { id: string }).id);
    if (Number.isNaN(id)) return reply.status(400).send({ error: "Invalid id" });
    const prank = await prankService.getPrankByIdForViewer(id, request.user.id);
    if (!prank) return reply.status(404).send({ error: "Not found" });
    const isOwner = prank.userId === request.user.id;
    const isWitness = prank.witnessUserId != null && prank.witnessUserId === request.user.id;
    const witness =
      prank.witness != null
        ? {
            id: prank.witness.id,
            firstName: prank.witness.firstName,
            lastName: prank.witness.lastName,
            username: prank.witness.username,
          }
        : null;
    return reply.send({
      ...prank,
      witness: prank.witness ? witness : undefined,
      confirmed: !!prank.confirmedAt,
      witnessRejected: !!prank.witnessRejectedAt,
      isOwner,
      isWitness,
    });
  });

  app.post("/api/pranks/:id/confirm", async (request, reply) => {
    if (!request.user) return reply.status(401).send({ error: "Unauthorized" });
    const id = Number((request.params as { id: string }).id);
    if (Number.isNaN(id)) return reply.status(400).send({ error: "Invalid id" });
    const prank = await prankService.confirmPrankByWitness(id, request.user.id);
    if (!prank) return reply.status(404).send({ error: "Not found" });
    return reply.send({ ...prank, confirmed: true });
  });

  app.post("/api/pranks/:id/reject", async (request, reply) => {
    if (!request.user) return reply.status(401).send({ error: "Unauthorized" });
    const id = Number((request.params as { id: string }).id);
    if (Number.isNaN(id)) return reply.status(400).send({ error: "Invalid id" });
    const prank = await prankService.rejectPrankByWitness(id, request.user.id);
    if (!prank) return reply.status(404).send({ error: "Not found" });
    return reply.send({ ...prank, witnessRejected: true });
  });

  app.post("/api/pranks/:id/complete", async (request, reply) => {
    if (!request.user) return reply.status(401).send({ error: "Unauthorized" });
    const id = Number((request.params as { id: string }).id);
    if (Number.isNaN(id)) return reply.status(400).send({ error: "Invalid id" });

    let completionStoryText: string | null = null;
    const photoBuffers: { buffer: Buffer; mimetype: string }[] = [];
    const videoBuffers: { buffer: Buffer; mimetype: string }[] = [];

    if (request.isMultipart()) {
      const parts = request.parts();
      for await (const part of parts) {
        if (part.type === "field") {
          const p = part as { fieldname: string; value: string };
          if (p.fieldname === "completionStoryText") completionStoryText = p.value;
        } else if (part.type === "file") {
          const p = part as { fieldname: string; file: AsyncIterable<Buffer>; mimetype: string };
          const chunks: Buffer[] = [];
          for await (const chunk of p.file) chunks.push(chunk);
          const buffer = Buffer.concat(chunks);
          if (p.fieldname === "photo" && (p.mimetype === "image/jpeg" || p.mimetype === "image/png")) {
            photoBuffers.push({ buffer, mimetype: p.mimetype });
          } else if (p.fieldname === "video" && p.mimetype.startsWith("video/")) {
            videoBuffers.push({ buffer, mimetype: p.mimetype });
          }
        }
      }
    }

    const prank = await prankService.completePrank(
      id,
      request.user.id,
      completionStoryText,
      photoBuffers,
      videoBuffers
    );
    if (!prank) return reply.status(404).send({ error: "Not found" });
    return reply.send({ ...prank, confirmed: !!prank.confirmedAt, witnessRejected: !!prank.witnessRejectedAt });
  });

  app.patch("/api/pranks/:id", async (request, reply) => {
    if (!request.user) return reply.status(401).send({ error: "Unauthorized" });
    const id = Number((request.params as { id: string }).id);
    if (Number.isNaN(id)) return reply.status(400).send({ error: "Invalid id" });
    const parsed = updatePrankBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Validation failed", details: parsed.error.flatten() });
    }
    try {
      const prank = await prankService.updatePrank(id, request.user.id, parsed.data);
      if (!prank) return reply.status(404).send({ error: "Not found" });
      return reply.send({ ...prank, confirmed: !!prank.confirmedAt, witnessRejected: !!prank.witnessRejectedAt });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("друг")) return reply.status(400).send({ error: msg });
      throw err;
    }
  });

  app.delete("/api/pranks/:id", async (request, reply) => {
    if (!request.user) return reply.status(401).send({ error: "Unauthorized" });
    const id = Number((request.params as { id: string }).id);
    if (Number.isNaN(id)) return reply.status(400).send({ error: "Invalid id" });
    const deleted = await prankService.deletePrank(id, request.user.id);
    if (!deleted) return reply.status(404).send({ error: "Not found" });
    return reply.status(204).send();
  });

  app.post("/api/pranks/:id/icon", async (request, reply) => {
    if (!request.user) return reply.status(401).send({ error: "Unauthorized" });
    const id = Number((request.params as { id: string }).id);
    if (Number.isNaN(id)) return reply.status(400).send({ error: "Invalid id" });
    const prank = await prankService.getPrankById(id, request.user.id);
    if (!prank) return reply.status(404).send({ error: "Not found" });

    if (!request.isMultipart()) {
      return reply.status(400).send({ error: "Expected multipart with icon file" });
    }
    const data = await request.file();
    if (!data) return reply.status(400).send({ error: "No file" });
    const chunks: Buffer[] = [];
    for await (const chunk of data.file) chunks.push(chunk);
    const buffer = Buffer.concat(chunks);
    const iconPath = await iconService.processUploadedIcon(buffer, data.mimetype);
    await prankService.updatePrank(id, request.user.id, {});
    const { prisma } = await import("../lib/db.js");
    await prisma.prank.update({
      where: { id },
      data: { iconType: "upload", iconPath },
    });
    const updated = await prankService.getPrankById(id, request.user.id);
    return reply.send(updated);
  });
}
