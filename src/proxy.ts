import type { NextRequest } from "next/server";
import { updateSession } from "@/infrastructure/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // Keep the collection endpoint explicit: Next's optional path matcher can
  // skip `/api/attempts` itself, which prevents Supabase auth cookies from
  // being refreshed before the create-attempt request.
  matcher: ["/assessment/:path*", "/api/attempts", "/api/attempts/:path*"],
};
