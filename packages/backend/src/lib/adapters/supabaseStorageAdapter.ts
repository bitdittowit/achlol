import { createClient } from "@supabase/supabase-js";
import type { Readable } from "node:stream";
import type { StorageAdapter } from "../storageAdapter.js";

const SUPABASE_URL = process.env.SUPABASE_URL ?? "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const BUCKET = process.env.STORAGE_SUPABASE_BUCKET ?? "uploads";

export function createSupabaseStorageAdapter(): StorageAdapter {
  const client = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  return {
    async upload(relativePath: string, buffer: Buffer, contentType?: string): Promise<void> {
      const { error } = await client.storage.from(BUCKET).upload(relativePath, buffer, {
        contentType: contentType ?? "application/octet-stream",
        upsert: true,
      });
      if (error) throw new Error(`Supabase upload failed: ${error.message}`);
    },
    async getReadStream(): Promise<Readable | null> {
      return null;
    },
    async getSignedUrl(relativePath: string, ttlSec: number): Promise<string | null> {
      const { data, error } = await client.storage.from(BUCKET).createSignedUrl(relativePath, ttlSec);
      if (error || !data?.signedUrl) return null;
      return data.signedUrl;
    },
    async delete(relativePath: string): Promise<void> {
      await client.storage.from(BUCKET).remove([relativePath]);
    },
  };
}
