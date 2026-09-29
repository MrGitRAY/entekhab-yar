import "server-only";

import { NextResponse, type NextRequest } from "next/server";
import { getServerClient } from "@/infrastructure/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { publicSupabaseConfig } from "@/infrastructure/supabase/config";
import { getCompletionClient } from "@/infrastructure/supabase/admin";

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "private, no-store" } });
}

export function sameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) return false;
  return request.headers.get("sec-fetch-site") !== "cross-site";
}

export async function authenticatedClient(request?: NextRequest) {
  const config = publicSupabaseConfig();
  const bearer = request?.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  const client = bearer && config
    ? createClient(config.url, config.key, { global: { headers: { Authorization: `Bearer ${bearer}` } } })
    : await getServerClient();
  const verifier = bearer ? getCompletionClient() : client;
  const { data, error } = bearer
    ? await verifier.auth.getUser(bearer)
    : await client.auth.getUser();
  if (error || !data?.user?.id) return null;
  return { client, ownerId: data.user.id };
}

export function databaseError(code: string | undefined) {
  switch (code) {
    case "40001": return json({ error: "پاسخ‌ها در جای دیگری تغییر کرده‌اند. صفحه را تازه‌سازی کنید." }, 409);
    case "22023": return json({ error: "اطلاعات آزمون معتبر نیست." }, 400);
    case "23514": return json({ error: "این عملیات برای وضعیت فعلی آزمون ممکن نیست." }, 409);
    case "42501": return json({ error: "به این آزمون دسترسی ندارید." }, 403);
    default: return json({ error: "ذخیره اطلاعات انجام نشد. دوباره تلاش کنید." }, 500);
  }
}
