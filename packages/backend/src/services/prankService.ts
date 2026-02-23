import { prisma } from "../lib/db.js";
import type { CreatePrankBody, UpdatePrankBody, PrankStatus } from "@prankster/shared";
import { generateIconFromTitle } from "./iconService.js";
import { fullPath } from "../lib/storage.js";
import fs from "node:fs/promises";

export async function createPrank(
  userId: number,
  body: CreatePrankBody,
  iconPath?: string | null,
  mediaPath?: string | null
) {
  let finalIconPath: string | null = null;
  if (body.iconType === "auto") {
    finalIconPath = await generateIconFromTitle(body.title);
  } else if (iconPath) {
    finalIconPath = iconPath;
  }

  const prank = await prisma.prank.create({
    data: {
      userId,
      title: body.title,
      description: body.description ?? null,
      iconType: body.iconType,
      iconPath: finalIconPath,
      fromField: body.fromField,
      toField: body.toField,
      status: "planned",
      scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : null,
    },
  });

  if (mediaPath) {
    await prisma.media.create({
      data: {
        prankId: prank.id,
        type: "photo",
        filePath: mediaPath,
        sortOrder: 0,
      },
    });
  }

  return getPrankById(prank.id, userId);
}

export async function listPranks(userId: number, status?: PrankStatus) {
  const where: { userId: number; status?: PrankStatus } = { userId };
  if (status) where.status = status;

  return prisma.prank.findMany({
    where,
    orderBy: [{ status: "asc" }, { scheduledAt: "asc" }, { createdAt: "desc" }],
    include: { media: true },
  });
}

export async function getPrankById(prankId: number, userId: number) {
  const prank = await prisma.prank.findFirst({
    where: { id: prankId, userId },
    include: { media: true },
  });
  return prank ?? null;
}

export async function updatePrank(
  prankId: number,
  userId: number,
  body: UpdatePrankBody
) {
  const existing = await getPrankById(prankId, userId);
  if (!existing) return null;

  const data: Parameters<typeof prisma.prank.update>[0]["data"] = {};
  if (body.title !== undefined) data.title = body.title;
  if (body.description !== undefined) data.description = body.description;
  if (body.fromField !== undefined) data.fromField = body.fromField;
  if (body.toField !== undefined) data.toField = body.toField;
  if (body.scheduledAt !== undefined) data.scheduledAt = body.scheduledAt ? new Date(body.scheduledAt) : null;
  if (body.status !== undefined) {
    data.status = body.status;
    if (body.status === "completed") {
      data.completedAt = new Date();
    }
  }
  if (body.completionStoryText !== undefined) data.completionStoryText = body.completionStoryText;

  await prisma.prank.update({
    where: { id: prankId },
    data,
  });

  return getPrankById(prankId, userId);
}

export async function deletePrankIcon(prankId: number, userId: number): Promise<boolean> {
  const prank = await getPrankById(prankId, userId);
  if (!prank?.iconPath) return false;
  try {
    await fs.unlink(fullPath(prank.iconPath));
  } catch {
    // ignore
  }
  await prisma.prank.update({
    where: { id: prankId },
    data: { iconPath: null },
  });
  return true;
}
