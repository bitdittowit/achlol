import { prisma } from "../lib/db.js";
import type { CreatePrankBody, UpdatePrankBody, PrankStatus, PrankListQuery } from "@prankster/shared";
import { generateIconFromTitle } from "./iconService.js";
import { mediaRelativePath, uniqueFilename } from "../lib/storage.js";
import { getStorageAdapter } from "../lib/adapters/index.js";
import { compressMediaImage } from "../lib/compressMedia.js";
import { sendMessage, downloadTelegramFile } from "../lib/telegramBot.js";
import { areFriends, getFriends } from "./friendService.js";
import { processUploadedIcon } from "./iconService.js";

/** Лимит только на запланированные приколы; архив (completed) не лимитируется. */
const ACTIVE_PRANKS_LIMIT = 30;

export async function createPrank(
  userId: number,
  body: CreatePrankBody,
  iconPath?: string | null,
  mediaPath?: string | null
) {
  const activeCount = await prisma.prank.count({
    where: { userId, status: "planned" },
  });
  if (activeCount >= ACTIVE_PRANKS_LIMIT) {
    throw new Error(
      "Достигнут лимит запланированных приколов (30). Отметьте старые как «Случилось» или удалите."
    );
  }

  let finalIconPath: string | null = null;
  if (body.iconType === "auto") {
    finalIconPath = await generateIconFromTitle(body.title);
  } else if (iconPath) {
    finalIconPath = iconPath;
  }

  let witnessUserId: number | null = null;
  if (body.witnessUserId != null) {
    const ok = await areFriends(userId, body.witnessUserId);
    if (!ok) throw new Error("Свидетелем может быть только друг");
    witnessUserId = body.witnessUserId;
  }

  const prank = await prisma.prank.create({
    data: {
      userId,
      title: body.title,
      description: body.description ?? null,
      iconType: body.iconType,
      iconPath: finalIconPath,
      participants: body.participants.trim(),
      status: "planned",
      scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : null,
      witnessUserId,
    },
  });

  if (witnessUserId) {
    const witness = await prisma.user.findUnique({ where: { id: witnessUserId } });
    const author = await prisma.user.findUnique({ where: { id: userId } });
    const authorName = author ? [author.firstName, author.lastName].filter(Boolean).join(" ") || "Кто-то" : "Кто-то";
    if (witness?.telegramId) {
      await sendMessage(
        witness.telegramId,
        `${authorName} просит подтвердить прикол: «${prank.title}». Это было на самом деле?`,
        [
          [{ text: "Подтвердить", callback_data: `prank_confirm_${prank.id}` }],
          [{ text: "Отклонить", callback_data: `prank_reject_${prank.id}` }],
        ]
      );
    }
  }

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

export async function listPranks(userId: number, query?: PrankListQuery) {
  const where: {
    userId: number;
    status?: PrankStatus;
    participants?: { contains: string; mode: "insensitive" };
    confirmedAt?: { not: null };
  } = { userId };
  if (query?.status) where.status = query.status;
  if (query?.participantsQuery?.trim()) {
    where.participants = { contains: query.participantsQuery.trim(), mode: "insensitive" };
  }
  if (query?.confirmedOnly === true) where.confirmedAt = { not: null };

  return prisma.prank.findMany({
    where,
    orderBy: [{ status: "asc" }, { scheduledAt: "asc" }, { createdAt: "desc" }],
    include: { media: true },
  });
}

/** Pranks from friends for the feed (only completed), newest first. */
export async function getFeedPranks(viewerUserId: number, limit = 50) {
  const friends = await getFriends(viewerUserId);
  const friendIds = friends.map((f) => f.id);
  if (friendIds.length === 0) return [];
  const pranks = await prisma.prank.findMany({
    where: { userId: { in: friendIds }, status: "completed" },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      media: true,
      user: { select: { id: true, username: true, firstName: true, lastName: true } },
    },
  });
  return pranks;
}

export async function countActivePranks(userId: number): Promise<number> {
  return prisma.prank.count({
    where: { userId, status: "planned" },
  });
}

export async function getPrankById(prankId: number, userId: number) {
  const prank = await prisma.prank.findFirst({
    where: { id: prankId, userId },
    include: { media: true },
  });
  return prank ?? null;
}

/** Returns prank if viewer is owner or friend of owner (for read-only view). Includes witness for confirmation flow. */
export async function getPrankByIdForViewer(prankId: number, viewerUserId: number) {
  const prank = await prisma.prank.findUnique({
    where: { id: prankId },
    include: {
      media: true,
      witness: { select: { id: true, firstName: true, lastName: true, username: true } },
    },
  });
  if (!prank) return null;
  if (prank.userId === viewerUserId) return prank;
  const ok = await areFriends(prank.userId, viewerUserId);
  return ok ? prank : null;
}

export async function createQuickPrankFromBot(
  userId: number,
  fileId: string,
  caption?: string | null
): Promise<{ id: number; title: string }> {
  const activeCount = await prisma.prank.count({
    where: { userId, status: "planned" },
  });
  if (activeCount >= ACTIVE_PRANKS_LIMIT) {
    throw new Error(
      "Достигнут лимит запланированных приколов (30). Отметьте старые как «Случилось» или удалите."
    );
  }
  const buffer = await downloadTelegramFile(fileId);
  const { buffer: compressed, ext } = await compressMediaImage(buffer, "image/jpeg");
  const filename = uniqueFilename(ext);
  const mediaPath = mediaRelativePath(filename);
  await getStorageAdapter().upload(mediaPath, compressed, "image/jpeg");
  const iconPath = await processUploadedIcon(compressed, "image/jpeg");
  const title =
    (caption?.trim() && caption.trim().length > 0)
      ? caption.trim().slice(0, 200)
      : `Фото от ${new Date().toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" })}`;
  const prank = await prisma.prank.create({
    data: {
      userId,
      title,
      description: null,
      iconType: "upload",
      iconPath,
      participants: "Я",
      status: "planned",
      scheduledAt: null,
    },
  });
  await prisma.media.create({
    data: {
      prankId: prank.id,
      type: "photo",
      filePath: mediaPath,
      sortOrder: 0,
    },
  });
  return { id: prank.id, title: prank.title };
}

export async function confirmPrankByWitness(prankId: number, witnessUserId: number) {
  const prank = await prisma.prank.findFirst({
    where: { id: prankId, witnessUserId },
  });
  if (!prank) return null;
  if (prank.confirmedAt) return prank;
  await prisma.prank.update({
    where: { id: prankId },
    data: { confirmedAt: new Date() },
  });
  return prisma.prank.findUnique({ where: { id: prankId }, include: { media: true } });
}

/** Idempotent: set witnessRejectedAt and notify author. Returns prank or null. */
export async function rejectPrankByWitness(prankId: number, witnessUserId: number) {
  const prank = await prisma.prank.findFirst({
    where: { id: prankId, witnessUserId },
    include: { user: true, witness: true },
  });
  if (!prank) return null;
  if (prank.witnessRejectedAt) {
    return prisma.prank.findUnique({ where: { id: prankId }, include: { media: true } });
  }
  await prisma.prank.update({
    where: { id: prankId },
    data: { witnessRejectedAt: new Date() },
  });
  const witnessName =
    [prank.witness?.firstName, prank.witness?.lastName].filter(Boolean).join(" ") ||
    prank.witness?.username ||
    "Свидетель";
  const author = await prisma.user.findUnique({
    where: { id: prank.userId },
    select: { telegramId: true },
  });
  if (author?.telegramId) {
    await sendMessage(
      author.telegramId,
      `${witnessName} не подтвердил прикол «${prank.title}»`
    );
  }
  return prisma.prank.findUnique({ where: { id: prankId }, include: { media: true } });
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
  if (body.participants !== undefined) data.participants = body.participants.trim();
  if (body.scheduledAt !== undefined) data.scheduledAt = body.scheduledAt ? new Date(body.scheduledAt) : null;
  if (body.witnessUserId !== undefined) {
    if (body.witnessUserId != null) {
      const ok = await areFriends(userId, body.witnessUserId);
      if (!ok) throw new Error("Свидетелем может быть только друг");
    }
    data.witnessUserId = body.witnessUserId;
  }
  if (body.status !== undefined) {
    data.status = body.status;
    if (body.status === "completed") {
      data.completedAt = new Date();
    }
  }
  if (body.completionStoryText !== undefined) data.completionStoryText = body.completionStoryText;

  const wasCompleted = body.status === "completed" && existing.status !== "completed";
  await prisma.prank.update({
    where: { id: prankId },
    data,
  });

  if (wasCompleted) {
    const friends = await getFriends(userId);
    const owner = await prisma.user.findUnique({
      where: { id: userId },
      select: { firstName: true, lastName: true, username: true },
    });
    const ownerName = owner ? [owner.firstName, owner.lastName].filter(Boolean).join(" ") || owner.username || "Друг" : "Друг";
    const title = existing.title;
    for (const friend of friends) {
      const friendUser = await prisma.user.findUnique({
        where: { id: friend.id },
        select: { telegramId: true },
      });
      if (friendUser?.telegramId) {
        await sendMessage(
          friendUser.telegramId,
          `${ownerName} отметил прикол «${title}» как случившийся! 🎉`
        );
      }
    }
  }

  return getPrankById(prankId, userId);
}

/** Mark prank as completed with story text and optional new media (photos compressed, videos stored as-is). */
export async function completePrank(
  prankId: number,
  userId: number,
  completionStoryText: string | null,
  photoBuffers: { buffer: Buffer; mimetype: string }[],
  videoBuffers: { buffer: Buffer; mimetype: string }[]
) {
  const existing = await getPrankById(prankId, userId);
  if (!existing) return null;
  if (existing.status === "completed") return getPrankById(prankId, userId);

  const existingMedia = await prisma.media.findMany({
    where: { prankId },
    orderBy: { sortOrder: "desc" },
    take: 1,
  });
  let sortOrder = existingMedia[0]?.sortOrder ?? -1;

  await prisma.prank.update({
    where: { id: prankId },
    data: {
      status: "completed",
      completedAt: new Date(),
      completionStoryText: completionStoryText?.trim() || null,
    },
  });

  for (const { buffer, mimetype } of photoBuffers) {
    sortOrder += 1;
    const { buffer: compressed, ext } = await compressMediaImage(buffer, mimetype);
    const filename = uniqueFilename(ext);
    const mediaPath = mediaRelativePath(filename);
    const contentType = ext === ".png" ? "image/png" : "image/jpeg";
    await getStorageAdapter().upload(mediaPath, compressed, contentType);
    await prisma.media.create({
      data: { prankId, type: "photo", filePath: mediaPath, sortOrder },
    });
  }

  const videoExt = (mime: string) => (mime.includes("mp4") ? ".mp4" : mime.includes("quicktime") || mime.includes("mov") ? ".mov" : ".webm");
  for (const { buffer, mimetype } of videoBuffers) {
    sortOrder += 1;
    const ext = videoExt(mimetype);
    const filename = uniqueFilename(ext);
    const mediaPath = mediaRelativePath(filename);
    await getStorageAdapter().upload(mediaPath, buffer, mimetype);
    await prisma.media.create({
      data: { prankId, type: "video", filePath: mediaPath, sortOrder },
    });
  }

  const ownerId = existing.userId;
  const friends = await getFriends(ownerId);
  const owner = await prisma.user.findUnique({
    where: { id: ownerId },
    select: { firstName: true, lastName: true, username: true },
  });
  const ownerName = owner ? [owner.firstName, owner.lastName].filter(Boolean).join(" ") || owner.username || "Друг" : "Друг";
  const title = existing.title;
  for (const friend of friends) {
    const friendUser = await prisma.user.findUnique({
      where: { id: friend.id },
      select: { telegramId: true },
    });
    if (friendUser?.telegramId) {
      await sendMessage(
        friendUser.telegramId,
        `${ownerName} отметил прикол «${title}» как случившийся! 🎉`
      );
    }
  }

  return getPrankById(prankId, userId);
}

export async function deletePrankIcon(prankId: number, userId: number): Promise<boolean> {
  const prank = await getPrankById(prankId, userId);
  if (!prank?.iconPath) return false;
  await getStorageAdapter().delete(prank.iconPath);
  await prisma.prank.update({
    where: { id: prankId },
    data: { iconPath: null },
  });
  return true;
}

/** Delete prank and all its files from storage (icon + media). Cascade via adapter. */
export async function deletePrank(prankId: number, userId: number): Promise<boolean> {
  const prank = await getPrankById(prankId, userId);
  if (!prank) return false;
  const adapter = getStorageAdapter();
  if (prank.iconPath) {
    try {
      await adapter.delete(prank.iconPath);
    } catch {
      // ignore missing file
    }
  }
  if (prank.media?.length) {
    for (const m of prank.media) {
      try {
        await adapter.delete(m.filePath);
      } catch {
        // ignore missing file
      }
    }
  }
  await prisma.prank.delete({ where: { id: prankId } });
  return true;
}
