import "server-only";

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { publicSupabaseConfig } from "./config";

export async function getServerClient() {
  const config = publicSupabaseConfig();
  if (!config) throw new Error("Supabase configuration is missing");
  const cookieStore = await cookies();
  return createServerClient(config.url, config.key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(items: { name: string; value: string; options: CookieOptions }[]) {
        try {
          items.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Server Components cannot write cookies. Proxy refreshes them.
        }
      },
    },
  });
}
