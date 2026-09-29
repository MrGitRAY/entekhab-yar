"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { evaluate } from "@/domain/matching/engine";
import { canonicalJson } from "@/domain/matching/canonical.mjs";
import type { ResultSnapshot } from "@/domain/matching/types";
import { localCatalog } from "@/infrastructure/catalog/local";
import { parseStartInput } from "@/domain/assessment/input";
import { ResultView } from "./result-view";
export function PreviewResult({ detailed = false }: { detailed?: boolean }) {
  const [state, setState] = useState<{ result: ResultSnapshot; name: string } | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    try {
      const start = parseStartInput(JSON.parse(sessionStorage.getItem("ey-preview-start") ?? "null"));
      const saved = JSON.parse(sessionStorage.getItem("ey-preview-answers") ?? "null");
      if (!saved?.submitted || saved.group !== start.examGroup || saved.catalogVersion !== localCatalog.questions.catalogVersion) throw new Error("ابتدا پیش‌نمایش همین نسخه را کامل و ثبت نهایی کن. پاسخ‌های نسخهٔ قدیمی با روش جدید تفسیر نمی‌شوند.");
      const key = canonicalJson({ version: saved.catalogVersion, group: start.examGroup, answers: saved.answers });
      const stored = JSON.parse(sessionStorage.getItem("ey-preview-result") ?? "null");
      const result: ResultSnapshot = stored?.key === key && stored.result?.engineVersion === localCatalog.scoring.engineVersion ? stored.result : evaluate(localCatalog, start.examGroup, saved.answers);
      sessionStorage.setItem("ey-preview-result", JSON.stringify({ key, result }));
      setState({ result, name: start.displayName });
    } catch (e) { setError(e instanceof Error ? e.message : "پیش‌نمایش در دسترس نیست."); }
  }, []);
  if (error) return <main className="simple-page"><h1>نتیجه آماده نیست</h1><p role="alert">{error}</p><Link href="/">بازگشت به شروع</Link></main>;
  if (!state) return <main className="simple-page"><p role="status">در حال بررسی پاسخ‌ها…</p></main>;
  return <ResultView result={state.result} displayName={state.name} preview detailed={detailed} reportHref="/preview/results/report" summaryHref="/preview/results"/>;
}
