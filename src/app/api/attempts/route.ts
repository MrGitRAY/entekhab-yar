import type { NextRequest } from "next/server";
import { parseStartInput } from "@/domain/assessment/input";
import { publicSupabaseConfig } from "@/infrastructure/supabase/config";
import { authenticatedClient, databaseError, json, sameOrigin } from "@/server/services/api";

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return json({ error: "درخواست نامعتبر است." }, 403);
  if (!publicSupabaseConfig()) return json({ error: "شروع آزمون اصلی هنوز در دسترس نیست." }, 503);
  let input;
  try {
    input = parseStartInput(await request.json());
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "اطلاعات اولیه معتبر نیست." }, 400);
  }
  const session = await authenticatedClient(request);
  if (!session) return json({ error: "نشست شما آماده نیست. دوباره شروع کنید." }, 401);
  const { data, error } = await session.client.rpc("create_attempt", {
    p_display_name: input.displayName,
    p_exam_year: input.examYear,
    p_exam_group: input.examGroup,
  });
  if (error) return databaseError(error.code);
  return json({ id: data }, 201);
}
