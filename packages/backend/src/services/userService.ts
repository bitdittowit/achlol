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
