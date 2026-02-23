import { prisma } from "../lib/db.js";
import { sendMessage } from "../lib/telegramBot.js";

export async function sendFriendRequest(fromUserId: number, toUsername: string) {
  const cleanUsername = toUsername.replace(/^@/, "").trim().toLowerCase();
  if (!cleanUsername) throw new Error("Укажите username");
  const toUser = await prisma.user.findFirst({
    where: { username: { equals: cleanUsername, mode: "insensitive" } },
  });
  if (!toUser) throw new Error("Пользователь не найден");
  if (toUser.id === fromUserId) throw new Error("Нельзя добавить самого себя");
  const existing = await prisma.friendRequest.findUnique({
    where: { fromUserId_toUserId: { fromUserId, toUserId: toUser.id } },
  });
  if (existing) {
    if (existing.status === "pending") throw new Error("Заявка уже отправлена");
    if (existing.status === "accepted") throw new Error("Вы уже друзья");
  }
  const areFriends = await prisma.friend.findUnique({
    where: { userId_friendUserId: { userId: fromUserId, friendUserId: toUser.id } },
  });
  if (areFriends) throw new Error("Вы уже друзья");
  const req = await prisma.friendRequest.upsert({
    where: { fromUserId_toUserId: { fromUserId, toUserId: toUser.id } },
    create: { fromUserId, toUserId: toUser.id, status: "pending" },
    update: { status: "pending" },
    include: { fromUser: { select: { firstName: true, lastName: true } } },
  });
  const fromName = [req.fromUser.firstName, req.fromUser.lastName].filter(Boolean).join(" ") || "Кто-то";
  await sendMessage(
    toUser.telegramId,
    `${fromName} хочет добавить вас в друзья в Prankster. Принять?`,
    [
      [{ text: "Принять", callback_data: `fr_accept_${req.id}` }],
      [{ text: "Отклонить", callback_data: `fr_reject_${req.id}` }],
    ]
  );
  const fromUser = await prisma.user.findUnique({ where: { id: fromUserId } });
  if (fromUser?.telegramId) {
    const toDisplay = toUser.username ? `@${toUser.username}` : [toUser.firstName, toUser.lastName].filter(Boolean).join(" ") || "пользователю";
    await sendMessage(fromUser.telegramId, `Заявка в друзья отправлена ${toDisplay}. Ожидайте ответа.`);
  }
  return toUser;
}

export async function getIncomingRequests(userId: number) {
  return prisma.friendRequest.findMany({
    where: { toUserId: userId, status: "pending" },
    include: { fromUser: { select: { id: true, username: true, firstName: true, lastName: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function acceptRequest(requestId: number, userId: number) {
  const req = await prisma.friendRequest.findFirst({
    where: { id: requestId, toUserId: userId, status: "pending" },
    include: {
      fromUser: { select: { id: true, telegramId: true, firstName: true, lastName: true, username: true } },
      toUser: { select: { id: true, telegramId: true, firstName: true, lastName: true, username: true } },
    },
  });
  if (!req) return null;
  await prisma.$transaction([
    prisma.friendRequest.update({ where: { id: requestId }, data: { status: "accepted" } }),
    prisma.friend.upsert({
      where: { userId_friendUserId: { userId: req.fromUserId, friendUserId: req.toUserId } },
      create: { userId: req.fromUserId, friendUserId: req.toUserId },
      update: {},
    }),
    prisma.friend.upsert({
      where: { userId_friendUserId: { userId: req.toUserId, friendUserId: req.fromUserId } },
      create: { userId: req.toUserId, friendUserId: req.fromUserId },
      update: {},
    }),
  ]);
  const accepterName = [req.toUser.firstName, req.toUser.lastName].filter(Boolean).join(" ") || req.toUser.username || "Пользователь";
  const initiatorName = [req.fromUser.firstName, req.fromUser.lastName].filter(Boolean).join(" ") || req.fromUser.username || "Пользователь";
  if (req.fromUser.telegramId) {
    await sendMessage(req.fromUser.telegramId, `${accepterName} принял(а) вашу заявку в друзья. Теперь вы друзья в Prankster!`);
  }
  if (req.toUser.telegramId) {
    await sendMessage(req.toUser.telegramId, `Вы и ${initiatorName} теперь друзья в Prankster.`);
  }
  return req;
}

export async function rejectRequest(requestId: number, userId: number) {
  const req = await prisma.friendRequest.findFirst({
    where: { id: requestId, toUserId: userId, status: "pending" },
    include: { fromUser: { select: { telegramId: true } }, toUser: { select: { firstName: true, lastName: true, username: true } } },
  });
  if (!req) return null;
  await prisma.friendRequest.update({ where: { id: requestId }, data: { status: "rejected" } });
  const toName = [req.toUser.firstName, req.toUser.lastName].filter(Boolean).join(" ") || req.toUser.username || "Пользователь";
  if (req.fromUser.telegramId) {
    await sendMessage(req.fromUser.telegramId, `${toName} отклонил(а) заявку в друзья.`);
  }
  return req;
}

export async function getOutgoingRequests(userId: number) {
  return prisma.friendRequest.findMany({
    where: { fromUserId: userId, status: "pending" },
    include: { toUser: { select: { id: true, username: true, firstName: true, lastName: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function cancelRequest(requestId: number, userId: number) {
  const req = await prisma.friendRequest.findFirst({
    where: { id: requestId, fromUserId: userId, status: "pending" },
    include: { fromUser: { select: { firstName: true, lastName: true } }, toUser: { select: { telegramId: true } } },
  });
  if (!req) return null;
  await prisma.friendRequest.update({ where: { id: requestId }, data: { status: "cancelled" } });
  const fromName = [req.fromUser.firstName, req.fromUser.lastName].filter(Boolean).join(" ") || "Кто-то";
  if (req.toUser.telegramId) {
    await sendMessage(req.toUser.telegramId, `${fromName} отменил(а) заявку в друзья.`);
  }
  return req;
}

export async function getFriends(userId: number) {
  const rows = await prisma.friend.findMany({
    where: { userId },
    include: { friendUser: { select: { id: true, username: true, firstName: true, lastName: true } } },
  });
  return rows.map((r) => r.friendUser);
}

export async function areFriends(userId: number, friendUserId: number): Promise<boolean> {
  const f = await prisma.friend.findUnique({
    where: { userId_friendUserId: { userId, friendUserId } },
  });
  return !!f;
}
