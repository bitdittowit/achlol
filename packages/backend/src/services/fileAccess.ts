import { prisma } from "../lib/db.js";

function normalizePath(p: string): string {
  return p.replace(/\\/g, "/");
}

export async function userCanAccessFile(userId: number, relativePath: string): Promise<boolean> {
  const norm = normalizePath(relativePath);
  const prankWithIcon = await prisma.prank.findFirst({
    where: { userId, iconPath: norm },
  });
  if (prankWithIcon) return true;
  const media = await prisma.media.findFirst({
    where: { filePath: norm, prank: { userId } },
  });
  return !!media;
}
