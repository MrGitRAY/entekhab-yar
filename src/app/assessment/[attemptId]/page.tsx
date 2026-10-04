import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { EvaluateButton } from "@/features/results/evaluate-button";
import { AssessmentForm, type AssessmentQuestion } from "@/features/assessment/assessment-form";
import { publicSupabaseConfig } from "@/infrastructure/supabase/config";
import { getServerClient } from "@/infrastructure/supabase/server";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ attemptId: string }> };
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function AssessmentPage({ params }: Props) {
  const { attemptId } = await params;
  if (!uuidPattern.test(attemptId)) notFound();
  if (!publicSupabaseConfig()) {
    return <main className="simple-page"><h1>آزمون هنوز در دسترس نیست</h1><p>اتصال ذخیره‌سازی این نسخه آماده نشده است.</p><Link href="/">بازگشت به شروع</Link></main>;
  }
  const client = await getServerClient();
  const { data: claims } = await client.auth.getClaims();
  const ownerId = claims?.claims?.sub;
  if (!ownerId) notFound();
  const { data: attempt, error: attemptError } = await client.from("attempts")
    .select("id,display_name,exam_year,exam_group,catalog_version,status,revision")
    .eq("id", attemptId).eq("owner_id", ownerId).single();
  if (attemptError || !attempt) notFound();
  if (attempt.status === "completed") redirect(`/results/${attemptId}`);
  if (attempt.status !== "draft") {
    return (
      <main className="simple-page submission-page">
        <div className="brand"><img className="brand-logo" src="/logo-rahyar.png" alt=""/><span className="brand-copy"><strong>انتخاب‌یار</strong><small>مرکز مشاوره تحصیلی رهیار</small></span></div>
        <div className="submission-content">
          <div className="success-icon" aria-hidden="true">✓</div>
          <span className="step-tag">آزمون ثبت شد</span>
          <h1>پاسخ‌هایت ثبت شد، {attempt.display_name}.</h1>
          <p>همهٔ پاسخ‌ها آمادهٔ محاسبهٔ نتیجهٔ اکتشافی هستند.</p>
          <div className="submission-actions"><EvaluateButton attemptId={attemptId}/><Link className="text-link" href="/">بازگشت به شروع</Link></div>
        </div>
      </main>
    );
  }
  const [questionResult, answerResult, catalogResult] = await Promise.all([
    client.from("catalog_questions").select("id,position,question_text,section,primary_dimension,groups").eq("catalog_version", attempt.catalog_version).order("position"),
    client.from("answers").select("question_id,value").eq("attempt_id", attemptId),
    client.from("catalog_releases").select("payload").eq("version", attempt.catalog_version).single(),
  ]);
  if (questionResult.error || answerResult.error || catalogResult.error || !catalogResult.data) {
    throw new Error("Assessment data could not be loaded");
  }
  const group = attempt.exam_group;
  const payload = catalogResult.data.payload as { scoring?: { scale?: { labels?: string[] }; dimensions?: { id: string }[] } };
  const labels = payload.scoring?.scale?.labels;
  const dimensions = payload.scoring?.dimensions;
  if (!Array.isArray(labels) || labels.length !== 5 || !Array.isArray(dimensions)) throw new Error("Catalog answer scale is invalid");
  const order = new Map(dimensions.map((item, index) => [item.id, index]));
  const questions: AssessmentQuestion[] = (questionResult.data ?? [])
    .filter((question) => Array.isArray(question.groups) && question.groups.includes(group))
    .sort((a, b) => (order.get(a.primary_dimension) ?? 999) - (order.get(b.primary_dimension) ?? 999) || a.position - b.position)
    .map((question) => ({ id: question.id, text: question.question_text, section: question.section, position: question.position }));
  if (questions.length !== 70) throw new Error("نسخهٔ پرسش‌نامه به‌روز نیست؛ لطفاً migration و seed نسخهٔ ۰٫۳ را اجرا کنید.");
  const answers = Object.fromEntries((answerResult.data ?? []).map((item) => [item.question_id, item.value]));
  return (
    <AssessmentForm attemptId={attempt.id} displayName={attempt.display_name} group={group}
      questions={questions} labels={labels} initialAnswers={answers} initialRevision={attempt.revision} catalogVersion={attempt.catalog_version} />
  );
}
