import type { Readable } from "node:stream";

export interface StorageAdapter {
  upload(relativePath: string, buffer: Buffer, contentType?: string): Promise<void>;
  getReadStream(relativePath: string): Promise<Readable | null>;
  getSignedUrl(relativePath: string, ttlSec: number): Promise<string | null>;
  delete(relativePath: string): Promise<void>;
}
