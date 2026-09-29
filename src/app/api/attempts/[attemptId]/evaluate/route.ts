import type { NextRequest } from "next/server";
import { authenticatedClient, json, sameOrigin } from "@/server/services/api";
import { evaluateAttempt } from "@/server/services/evaluate-attempt";
import { publicSupabaseConfig } from "@/infrastructure/supabase/config";

export async function POST(request: NextRequest, { params }: { params: Promise<{ attemptId: string }> }) {
  if (!sameOrigin(request)) return json({ error: "درخواست از این مبدأ مجاز نیست." }, 403);
  if (!publicSupabaseConfig()) return json({ error: "ذخیره‌سازی هنوز تنظیم نشده است." }, 503);
  const { attemptId } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(attemptId)) return json({ error: "شناسه آزمون معتبر نیست." }, 400);
  try {
    const session = await authenticatedClient();
    if (!session) return json({ error: "نشست آزمون در دسترس نیست." }, 401);
    await evaluateAttempt(session.client, session.ownerId, attemptId);
    return json({ url: `/results/${attemptId}` });
  } catch (error) {
    const code = error instanceof Error ? error.message : "UNKNOWN";
    if (code === "NOT_FOUND") return json({ error: "آزمون در دسترس نیست." }, 404);
    if (code === "NOT_SUBMITTED") return json({ error: "ابتدا تمام پاسخ‌ها را ثبت نهایی کنید." }, 409);
    if (code === "UNSUPPORTED_CATALOG") return json({ error: "این آزمون از نسخه قدیمی است. پاسخ‌های قبلی محفوظ‌اند؛ برای روش جدید یک آزمون تازه شروع کنید." }, 409);
    if (code === "COMPLETION_NOT_CONFIGURED") return json({ error: "ثبت نتیجه در سرور هنوز تنظیم نشده است. پاسخ‌ها محفوظ‌اند." }, 503);
    return json({ error: "محاسبه نتیجه انجام نشد. پاسخ‌ها محفوظ‌اند؛ دوباره تلاش کنید." }, 500);
  }
}
