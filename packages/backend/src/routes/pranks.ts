import type { FastifyInstance } from "fastify";
import {
  createPrankBodySchema,
  updatePrankBodySchema,
  prankListQuerySchema,
} from "@prankster/shared";
import * as prankService from "../services/prankService.js";
import * as iconService from "../services/iconService.js";
import { fullPath, mediaRelativePath, uniqueFilename } from "../lib/storage.js";
import fs from "node:fs/promises";

export async function pranksRoutes(app: FastifyInstance) {
  app.get("/api/pranks", async (request, reply) => {
    if (!request.user) return reply.status(401).send({ error: "Unauthorized" });
    const parsed = prankListQuerySchema.safeParse(request.query);
    const status = parsed.success ? parsed.data.status : undefined;
    const list = await prankService.listPranks(request.user.id, status);
    return reply.send(list);
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
            const ext = p.mimetype === "image/png" ? ".png" : ".jpg";
            const filename = uniqueFilename(ext);
            mediaPath = mediaRelativePath(filename);
            await fs.writeFile(fullPath(mediaPath), buffer);
          }
        }
      }
      body = {
        title: fields.title,
        description: fields.description ?? null,
        iconType: fields.iconType ?? "auto",
        fromField: fields.fromField,
        toField: fields.toField,
        scheduledAt: fields.scheduledAt || null,
      };
    } else {
      body = (await request.body) as Record<string, unknown>;
    }

    const parsed = createPrankBodySchema.safeParse(body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Validation failed", details: parsed.error.flatten() });
    }
    const prank = await prankService.createPrank(
      request.user.id,
      parsed.data,
      iconPath,
      mediaPath
    );
    return reply.status(201).send(prank);
  });

  app.get("/api/pranks/:id", async (request, reply) => {
    if (!request.user) return reply.status(401).send({ error: "Unauthorized" });
    const id = Number((request.params as { id: string }).id);
    if (Number.isNaN(id)) return reply.status(400).send({ error: "Invalid id" });
    const prank = await prankService.getPrankById(id, request.user.id);
    if (!prank) return reply.status(404).send({ error: "Not found" });
    return reply.send(prank);
  });

  app.patch("/api/pranks/:id", async (request, reply) => {
    if (!request.user) return reply.status(401).send({ error: "Unauthorized" });
    const id = Number((request.params as { id: string }).id);
    if (Number.isNaN(id)) return reply.status(400).send({ error: "Invalid id" });
    const parsed = updatePrankBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Validation failed", details: parsed.error.flatten() });
    }
    const prank = await prankService.updatePrank(id, request.user.id, parsed.data);
    if (!prank) return reply.status(404).send({ error: "Not found" });
    return reply.send(prank);
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
