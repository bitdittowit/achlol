import fs from "node:fs/promises";
import { createReadStream } from "node:fs";
import path from "node:path";
import type { Readable } from "node:stream";
import { fullPath } from "../storage.js";
import type { StorageAdapter } from "../storageAdapter.js";

export function createLocalStorageAdapter(): StorageAdapter {
  return {
    async upload(relativePath: string, buffer: Buffer): Promise<void> {
      const absolute = fullPath(relativePath);
      await fs.mkdir(path.dirname(absolute), { recursive: true });
      await fs.writeFile(absolute, buffer);
    },
    async getReadStream(relativePath: string): Promise<Readable | null> {
      const absolute = fullPath(relativePath);
      return createReadStream(absolute);
    },
    async getSignedUrl(): Promise<string | null> {
      return null;
    },
    async delete(relativePath: string): Promise<void> {
      try {
        await fs.unlink(fullPath(relativePath));
      } catch {
        // ignore
      }
    },
  };
}
