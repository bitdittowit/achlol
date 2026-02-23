import type { StorageAdapter } from "../storageAdapter.js";
import { createLocalStorageAdapter } from "./localStorageAdapter.js";
import { createSupabaseStorageAdapter } from "./supabaseStorageAdapter.js";

let instance: StorageAdapter | null = null;

export function getStorageAdapter(): StorageAdapter {
  if (!instance) {
    const kind = process.env.STORAGE_ADAPTER ?? "local";
    if (kind === "supabase") {
      instance = createSupabaseStorageAdapter();
    } else {
      instance = createLocalStorageAdapter();
    }
  }
  return instance;
}
