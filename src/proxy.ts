import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { updateSession } from "@/infrastructure/supabase/proxy";
import { ACCESS_COOKIE, accessGateConfigured, isValidAccessToken } from "@/infrastructure/access/gate";

export async function proxy(request: NextRequest) {
  const sessionResponse = await updateSession(request);
  if (request.nextUrl.pathname === "/api/access") return sessionResponse;
  if (!accessGateConfigured() || await isValidAccessToken(request.cookies.get(ACCESS_COOKIE)?.value)) return sessionResponse;
  if (request.nextUrl.pathname.startsWith("/api/")) return NextResponse.json({ error: "ابتدا رمز ورود آزمون را وارد کنید." }, { status: 401 });
  const url = request.nextUrl.clone();
  url.pathname = "/access";
  url.search = `?next=${encodeURIComponent(request.nextUrl.pathname + request.nextUrl.search)}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/", "/assessment/:path*", "/results/:path*", "/preview/:path*", "/api/:path*"],
};
