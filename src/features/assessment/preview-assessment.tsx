"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import questionsCatalog from "../../../data/questions.json";
import scoringCatalog from "../../../data/scoring.json";
import { parseStartInput, type StartInput } from "@/domain/assessment/input";
import { AssessmentForm, type AssessmentQuestion } from "./assessment-form";

type PreviewData = {
  start: StartInput;
  answers: Record<string, number>;
  revision: number;
  submitted: boolean;
};
type SavedPreview = { group?: string; catalogVersion?: string; answers?: Record<string, number>; revision?: number; submitted?: boolean };

export function PreviewAssessment() {
  const [data, setData] = useState<PreviewData | null | undefined>(undefined);
  useEffect(() => {
    try {
      const start = parseStartInput(JSON.parse(sessionStorage.getItem("ey-preview-start") ?? "null"));
      const saved = JSON.parse(sessionStorage.getItem("ey-preview-answers") ?? "null") as SavedPreview | null;
      if (saved && saved.catalogVersion !== questionsCatalog.catalogVersion) { setData(null); return; }
      const validSaved = saved?.group === start.examGroup && typeof saved.revision === "number" &&
        saved.answers && typeof saved.answers === "object";
      setData({
        start,
        answers: validSaved ? saved.answers as Record<string, number> : {},
        revision: validSaved ? saved.revision as number : 0,
        submitted: validSaved ? saved.submitted === true : false,
      });
    } catch {
      setData(null);
    }
  }, []);
  if (data === undefined) return <main className="simple-page"><p>در حال آماده‌سازی پیش‌نمایش…</p></main>;
  if (data === null) return <main className="simple-page"><h1>پیش‌نمایش این نسخه در دسترس نیست</h1><p>اگر پاسخ‌ها مربوط به نسخهٔ قبلی‌اند، برای سؤال‌های بازبینی‌شده یک آزمون تازه شروع کن.</p><Link className="text-link" href="/">بازگشت به شروع</Link></main>;
  const order = new Map(scoringCatalog.dimensions.map((item, index) => [item.id, index]));
  const questions: AssessmentQuestion[] = questionsCatalog.items
    .filter((item) => item.groups.includes(data.start.examGroup))
    .sort((a, b) => (order.get(a.primaryDimension) ?? 999) - (order.get(b.primaryDimension) ?? 999))
    .map((item, index) => ({ id: item.id, text: item.text, section: item.section, position: index + 1 }));
  return <AssessmentForm attemptId="preview" displayName={data.start.displayName} group={data.start.examGroup}
    questions={questions} labels={scoringCatalog.scale.labels} initialAnswers={data.answers}
    initialRevision={data.revision} catalogVersion={questionsCatalog.catalogVersion} preview initialSubmitted={data.submitted} />;
}
