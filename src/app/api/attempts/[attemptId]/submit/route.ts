import type { NextRequest } from "next/server";
import { publicSupabaseConfig } from "@/infrastructure/supabase/config";
import { authenticatedClient, databaseError, json, sameOrigin } from "@/server/services/api";

type Context = { params: Promise<{ attemptId: string }> };
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest, context: Context) {
  if (!sameOrigin(request)) return json({ error: "درخواست نامعتبر است." }, 403);
  if (!publicSupabaseConfig()) return json({ error: "ثبت آزمون اصلی هنوز در دسترس نیست." }, 503);
  const { attemptId } = await context.params;
  if (!uuidPattern.test(attemptId)) return json({ error: "شناسه آزمون معتبر نیست." }, 400);
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "اطلاعات ثبت نهایی معتبر نیست." }, 400);
  }
  const expectedRevision = typeof body === "object" && body !== null && !Array.isArray(body)
    ? (body as Record<string, unknown>).expectedRevision : undefined;
  if (!Number.isInteger(expectedRevision) || (expectedRevision as number) < 0) {
    return json({ error: "اطلاعات ثبت نهایی معتبر نیست." }, 400);
  }
  const session = await authenticatedClient();
  if (!session) return json({ error: "نشست شما منقضی شده است." }, 401);
  const { data, error } = await session.client.rpc("submit_attempt", {
    p_attempt_id: attemptId,
    p_expected_revision: expectedRevision as number,
  });
  if (error) return databaseError(error.code);
  return json({ status: data });
}
