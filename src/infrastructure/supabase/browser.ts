"use client";

import { createBrowserClient } from "@supabase/ssr";
import { publicSupabaseConfig } from "./config";

let browserClient: ReturnType<typeof createBrowserClient> | null = null;

export function getBrowserClient() {
  const config = publicSupabaseConfig();
  if (!config) throw new Error("شروع آزمون در حال حاضر در دسترس نیست.");
  browserClient ??= createBrowserClient(config.url, config.key);
  return browserClient;
}
