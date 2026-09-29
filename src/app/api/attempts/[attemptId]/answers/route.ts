import type { NextRequest } from "next/server";
import { publicSupabaseConfig } from "@/infrastructure/supabase/config";
import { authenticatedClient, databaseError, json, sameOrigin } from "@/server/services/api";

type Context = { params: Promise<{ attemptId: string }> };
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function PATCH(request: NextRequest, context: Context) {
  if (!sameOrigin(request)) return json({ error: "درخواست نامعتبر است." }, 403);
  if (!publicSupabaseConfig()) return json({ error: "ذخیره آزمون اصلی هنوز در دسترس نیست." }, 503);
  const { attemptId } = await context.params;
  if (!uuidPattern.test(attemptId)) return json({ error: "شناسه آزمون معتبر نیست." }, 400);
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 16000) return json({ error: "تعداد پاسخ‌ها بیش از حد مجاز است." }, 413);
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "ساختار پاسخ معتبر نیست." }, 400);
  }
  if (typeof body !== "object" || body === null || Array.isArray(body)) return json({ error: "ساختار پاسخ معتبر نیست." }, 400);
  const { expectedRevision, answers } = body as Record<string, unknown>;
  if (!Number.isInteger(expectedRevision) || (expectedRevision as number) < 0 ||
      typeof answers !== "object" || answers === null || Array.isArray(answers)) {
    return json({ error: "ساختار پاسخ معتبر نیست." }, 400);
  }
  const entries = Object.entries(answers);
  if (entries.length < 1 || entries.length > 60 || entries.some(([id, value]) =>
      !/^Q-[A-Z]+-\d{2}$/.test(id) || !Number.isInteger(value) || (value as number) < 1 || (value as number) > 5)) {
    return json({ error: "گزینه‌های پاسخ معتبر نیستند." }, 400);
  }
  const session = await authenticatedClient();
  if (!session) return json({ error: "نشست شما منقضی شده است." }, 401);
  const { data, error } = await session.client.rpc("save_answers", {
    p_attempt_id: attemptId,
    p_expected_revision: expectedRevision as number,
    p_answers: answers,
  });
  if (error) return databaseError(error.code);
  return json({ revision: data });
}
