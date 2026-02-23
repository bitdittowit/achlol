import type { TelegramUser } from "../lib/telegramAuth.js";
import { prisma } from "../lib/db.js";

export async function findOrCreateUser(tg: TelegramUser) {
  const existing = await prisma.user.findUnique({
    where: { telegramId: String(tg.id) },
  });
  if (existing) {
    return prisma.user.update({
      where: { id: existing.id },
      data: {
        username: tg.username ?? null,
        firstName: tg.first_name,
        lastName: tg.last_name ?? null,
      },
    });
  }
  return prisma.user.create({
    data: {
      telegramId: String(tg.id),
      username: tg.username ?? null,
      firstName: tg.first_name,
      lastName: tg.last_name ?? null,
    },
  });
}

export async function getUserById(id: number) {
  return prisma.user.findUnique({
    where: { id },
  });
}

export async function findOrCreateUserFromBot(
  telegramId: string,
  profile?: { firstName?: string | null; lastName?: string | null; username?: string | null }
) {
  const existing = await prisma.user.findUnique({
    where: { telegramId },
  });
  if (existing) {
    if (profile && (profile.firstName != null || profile.lastName != null || profile.username != null)) {
      return prisma.user.update({
        where: { id: existing.id },
        data: {
          firstName: profile.firstName ?? existing.firstName,
          lastName: profile.lastName ?? existing.lastName,
          username: profile.username ?? existing.username,
        },
      });
    }
    return existing;
  }
  return prisma.user.create({
    data: {
      telegramId,
      username: profile?.username ?? null,
      firstName: profile?.firstName ?? null,
      lastName: profile?.lastName ?? null,
    },
  });
}
