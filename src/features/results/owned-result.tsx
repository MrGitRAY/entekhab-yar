import Link from "next/link";
import { notFound } from "next/navigation";
import { publicSupabaseConfig } from "@/infrastructure/supabase/config";
import { authenticatedClient } from "@/server/services/api";
import type { ResultSnapshot } from "@/domain/matching/types";
import { ResultView } from "./result-view";
import { EvaluateButton } from "./evaluate-button";
export async function OwnedResult({ attemptId, detailed = false }: { attemptId: string; detailed?: boolean }) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(attemptId) || !publicSupabaseConfig()) notFound();
  const session = await authenticatedClient(); if (!session) notFound();
  const { data: attempt, error } = await session.client.from("attempts").select("display_name,status").eq("id", attemptId).eq("owner_id", session.ownerId).maybeSingle();
  if (error) throw new Error("Result could not be loaded");
  if (!attempt) notFound();
  if (attempt.status !== "completed") return <main className="simple-page"><h1>نتیجه هنوز آماده نیست</h1>{attempt.status === "submitted" ? <EvaluateButton attemptId={attemptId}/> : <Link href={`/assessment/${attemptId}`}>ادامه آزمون</Link>}</main>;
  const { data, error: readError } = await session.client.from("results").select("snapshot").eq("attempt_id", attemptId).single();
  if (readError || !data) throw new Error("Result snapshot could not be loaded");
  const result = data.snapshot as ResultSnapshot;
  if (result.schemaVersion !== 2) return <main className="simple-page"><h1>گزارش مربوط به نسخهٔ قدیمی است</h1><p>نسخهٔ اصلی نتیجه حفظ شده است؛ برای روش تازه آزمون جدیدی شروع کنید.</p><Link href="/">بازگشت به شروع</Link></main>;
  return <ResultView result={result} displayName={attempt.display_name} detailed={detailed} reportHref={`/results/${attemptId}/report`} summaryHref={`/results/${attemptId}`} pdfHref={`/api/attempts/${attemptId}/report.pdf`}/>;
}

