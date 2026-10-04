import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { ACCESS_COOKIE, MAX_AGE_SECONDS, createAccessToken } from "@/infrastructure/access/gate";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const expected = process.env.SITE_ACCESS_PASSWORD?.trim();
  if (!expected) return NextResponse.json({ error: "رمز ورود در تنظیمات سرور ثبت نشده است." }, { status: 503 });
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) return NextResponse.json({ error: "درخواست نامعتبر است." }, { status: 403 });
  let password = "";
  try {
    const body = await request.json();
    password = typeof body?.password === "string" ? body.password : "";
  } catch { /* handled as an invalid password */ }
  if (password !== expected) return NextResponse.json({ error: "رمز ورود درست نیست." }, { status: 401 });
  const response = NextResponse.json({ ok: true });
  response.cookies.set(ACCESS_COOKIE, await createAccessToken(), {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: MAX_AGE_SECONDS,
  });
  return response;
}
