import "server-only";
import { createClient } from "@supabase/supabase-js";
import { publicSupabaseConfig } from "./config";

export function getCompletionClient() {
  const config = publicSupabaseConfig();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!config || !key) throw new Error("COMPLETION_NOT_CONFIGURED");
  return createClient(config.url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
