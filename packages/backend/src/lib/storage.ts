import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

const UPLOADS_DIR = process.env.UPLOADS_DIR ?? path.join(process.cwd(), "..", "..", "uploads");
const ICONS_SUBDIR = "icons";
const MEDIA_SUBDIR = "media";

export async function ensureUploadsDir(): Promise<void> {
  await fs.mkdir(path.join(UPLOADS_DIR, ICONS_SUBDIR), { recursive: true });
  await fs.mkdir(path.join(UPLOADS_DIR, MEDIA_SUBDIR), { recursive: true });
}

export function getUploadsDir(): string {
  return UPLOADS_DIR;
}

/** Returns relative path with forward slashes (e.g. "icons/uuid.png") for portability. */
export function iconRelativePath(filename: string): string {
  return `${ICONS_SUBDIR}/${filename}`;
}

/** Returns relative path with forward slashes (e.g. "media/uuid.jpg"). */
export function mediaRelativePath(filename: string): string {
  return `${MEDIA_SUBDIR}/${filename}`;
}

/** Resolve relative path (with / or \\) to absolute path; prevents traversal. */
export function fullPath(relativePath: string): string {
  const normalized = relativePath.replace(/\\/g, "/");
  if (normalized.includes("..")) {
    throw new Error("Invalid path");
  }
  const parts = normalized.split("/").filter(Boolean);
  return path.join(UPLOADS_DIR, ...parts);
}

export function uniqueFilename(ext: string): string {
  return `${randomUUID()}${ext}`;
}
