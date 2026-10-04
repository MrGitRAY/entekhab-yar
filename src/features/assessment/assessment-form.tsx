"use client";

import { useEffect, useRef, useState } from "react";
import { SubmissionComplete } from "./submission-complete";

export type AssessmentQuestion = {
  id: string;
  text: string;
  section: string;
  position: number;
};

type Props = {
  attemptId: string;
  displayName: string;
  group: string;
  questions: AssessmentQuestion[];
  labels: string[];
  initialAnswers: Record<string, number>;
  initialRevision: number;
  catalogVersion: string;
  preview?: boolean;
  initialSubmitted?: boolean;
};

const sectionTitles: Record<string, string> = {
  riasec: "علاقه‌ها",
  personality: "ویژگی‌های فردی",
  values: "چیزهای مهم برای من",
  abilities: "شیوه یادگیری و کار",
  workstyle: "سبک کار",
};

type SaveState = "saved" | "saving" | "failed";

export function AssessmentForm({ attemptId, displayName, group, questions, labels, initialAnswers, initialRevision, catalogVersion, preview = false, initialSubmitted = false }: Props) {
  const [currentIndex, setCurrentIndex] = useState(() => {
    const firstUnanswered = questions.findIndex((item) => !Number.isInteger(initialAnswers[item.id]));
    return firstUnanswered < 0 ? questions.length - 1 : firstUnanswered;
  });
  const [answers, setAnswers] = useState<Record<string, number>>(() => ({ ...initialAnswers }));
  const [savedCount, setSavedCount] = useState(Object.keys(initialAnswers).length);
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(initialSubmitted);
  const answersRef = useRef<Record<string, number>>({ ...initialAnswers });
  const savedRef = useRef<Record<string, number>>({ ...initialAnswers });
  const revisionRef = useRef(initialRevision);
  const pendingRef = useRef<Promise<boolean> | null>(null);
  const question = questions[currentIndex];
  const complete = questions.every((item) => Number.isInteger(answers[item.id]));
  const groupLabel = group === "experimental" ? "تجربی" : "ریاضی";

  useEffect(() => {
    function beforeUnload(event: BeforeUnloadEvent) {
      if (Object.keys(answersRef.current).some((id) => answersRef.current[id] !== savedRef.current[id])) {
        event.preventDefault();
      }
    }
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLSelectElement) return;
      if (/^[1-5]$/.test(event.key)) {
        event.preventDefault();
        choose(Number(event.key));
      } else if (event.key === "Enter") {
        event.preventDefault();
        if (currentIndex < questions.length - 1) setCurrentIndex((index) => index + 1);
        else void submit();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [currentIndex, questions.length, submitted, submitting]);

  function persist(): Promise<boolean> {
    if (pendingRef.current) return pendingRef.current;
    const job = (async () => {
      while (true) {
        const batch = Object.fromEntries(
          Object.entries(answersRef.current).filter(([id, value]) => savedRef.current[id] !== value),
        );
        if (Object.keys(batch).length === 0) {
          setSaveState("saved");
          return true;
        }
        setSaveState("saving");
        try {
          if (preview) {
            const nextRevision = revisionRef.current + 1;
            sessionStorage.setItem("ey-preview-answers", JSON.stringify({
              group, catalogVersion, answers: { ...savedRef.current, ...batch }, revision: nextRevision, submitted: false,
            }));
            revisionRef.current = nextRevision;
          } else {
            const response = await fetch(`/api/attempts/${attemptId}/answers`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              credentials: "same-origin",
              body: JSON.stringify({ expectedRevision: revisionRef.current, answers: batch }),
            });
            const result = await response.json();
            if (!response.ok || !Number.isInteger(result.revision)) {
              throw new Error(result.error || "ذخیره انجام نشد.");
            }
            revisionRef.current = result.revision;
          }
          savedRef.current = { ...savedRef.current, ...batch };
          setSavedCount(Object.keys(savedRef.current).length);
          setError("");
        } catch (cause) {
          setSaveState("failed");
          setError(cause instanceof Error && cause.message.includes("جای دیگری")
            ? cause.message : "پاسخ ذخیره نشد. اتصال را بررسی کنید و دوباره بزنید.");
          return false;
        }
      }
    })();
    pendingRef.current = job;
    void job.finally(() => { if (pendingRef.current === job) pendingRef.current = null; });
    return job;
  }

  function choose(value: number) {
    if (submitted || submitting) return;
    answersRef.current = { ...answersRef.current, [question.id]: value };
    setAnswers(answersRef.current);
    setError("");
    void persist();
  }

  async function submit() {
    if (submitting || submitted) return;
    const firstMissing = questions.findIndex((item) => !Number.isInteger(answersRef.current[item.id]));
    if (firstMissing >= 0) {
      setCurrentIndex(firstMissing);
      setError("برای ثبت نهایی، به همه پرسش‌ها پاسخ بده.");
      return;
    }
    setSubmitting(true);
    const saved = await persist();
    if (!saved) { setSubmitting(false); return; }
    try {
      if (preview) {
        sessionStorage.setItem("ey-preview-answers", JSON.stringify({
          group, catalogVersion, answers: savedRef.current, revision: revisionRef.current, submitted: true,
        }));
      } else {
        const response = await fetch(`/api/attempts/${attemptId}/submit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ expectedRevision: revisionRef.current }),
        });
        const result = await response.json();
        if (!response.ok || !["submitted", "completed"].includes(result.status)) {
          throw new Error(result.error || "ثبت نهایی انجام نشد.");
        }
      }
      setSubmitted(true);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "ثبت نهایی انجام نشد. دوباره تلاش کنید.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <SubmissionComplete attemptId={attemptId} displayName={displayName} preview={preview}/>
    );
  }

  return (
    <main className="assessment-shell">
      <header className="assessment-header">
        <div className="brand"><img className="brand-logo" src="/logo-rahyar.png" alt=""/><span className="brand-copy"><strong>انتخاب‌یار</strong><small>مرکز مشاوره تحصیلی رهیار</small></span></div>
        <div className="header-meta"><span className="header-name">{displayName}</span><span className="meta-separator" aria-hidden="true" /><span className="header-group">گروه {groupLabel}</span>{preview && <span className="preview-pill">پیش‌نمایش</span>}</div>
      </header>
      <div className="assessment-layout">
        <section className="assessment-main" aria-labelledby="question-title">
          <div className="assessment-topline">
            <div>
              <span className="step-tag">{sectionTitles[question.section] ?? "آزمون"}</span>
              <p className="question-number">پرسش {currentIndex + 1} از {questions.length}</p>
            </div>
            <p className={`save-message ${saveState}`} role="status" aria-live="polite">
              {saveState === "saving" ? "در حال ذخیره…" : saveState === "failed" ? "ذخیره نشد" : preview ? "در همین مرورگر ذخیره شده‌اند" : "پاسخ‌ها ذخیره شده‌اند"}
            </p>
          </div>
          <div className="progress-track" role="progressbar" aria-label="پیشرفت پاسخ‌های ذخیره‌شده"
            aria-valuemin={0} aria-valuemax={questions.length} aria-valuenow={savedCount}>
            <span style={{ width: `${savedCount / questions.length * 100}%` }} />
          </div>
          <p className="progress-copy">{savedCount} پاسخ ذخیره‌شده از {questions.length}</p>
          <div className="question-card">
            <fieldset>
              <legend id="question-title">{question.text}</legend>
              <p className="question-hint">میزان موافقتت را انتخاب کن.</p>
              <div className="answer-options">
                {labels.map((label, index) => {
                  const value = index + 1;
                  return (
                    <label key={value} className={`answer-option ${answers[question.id] === value ? "is-selected" : ""}`}>
                      <input type="radio" name={`answer-${question.id}`} value={value}
                        checked={answers[question.id] === value} onChange={() => choose(value)} />
                      <span className="answer-label">{label}</span>
                      <span className="answer-number" aria-hidden="true">{value}</span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          </div>
          {error && <div className="assessment-error" role="alert"><p>{error}</p>
            {saveState === "failed" && <button type="button" onClick={() => void persist()}>تلاش دوباره برای ذخیره</button>}
          </div>}
          <div className="assessment-actions">
            <button className="secondary-button" type="button" onClick={() => setCurrentIndex((index) => index - 1)} disabled={currentIndex === 0}>قبلی</button>
            {currentIndex < questions.length - 1
              ? <button className="primary-button" type="button" onClick={() => setCurrentIndex((index) => index + 1)}>بعدی <span aria-hidden="true">←</span></button>
              : <button className="primary-button" type="button" onClick={() => void submit()} disabled={submitting}>
                  {submitting ? "در حال ثبت…" : "ثبت نهایی پاسخ‌ها"}<span aria-hidden="true">✓</span>
                </button>}
          </div>
          <div className="keyboard-help" role="note"><strong>راهنمای سریع</strong><span>کلیدهای ۱ تا ۵ برای پاسخ</span><span>Enter برای پرسش بعدی</span></div>
          {complete && currentIndex < questions.length - 1 &&
            <button className="finish-link" type="button" onClick={() => void submit()} disabled={submitting}>همه پرسش‌ها پاسخ داده شده‌اند؛ ثبت نهایی</button>}
        </section>
        <aside className="assessment-sidebar">
          <div className="sidebar-card">
            <p className="sidebar-kicker">مسیر تو</p>
            <h2>با خیال راحت پیش برو</h2>
            <p>می‌توانی به پرسش‌های قبلی برگردی و پاسخت را عوض کنی. ثبت نهایی پس از پاسخ به همه پرسش‌ها انجام می‌شود.</p>
            <details className="question-index">
              <summary>نمایش همه پرسش‌ها</summary>
              <div className="question-grid">
                {questions.map((item, index) => (
                  <button key={item.id} type="button" onClick={() => setCurrentIndex(index)}
                    className={`${index === currentIndex ? "is-current" : ""} ${answers[item.id] ? "is-answered" : ""}`}
                    aria-label={`پرسش ${index + 1}${answers[item.id] ? "، پاسخ داده شده" : "، بی‌پاسخ"}`}
                    aria-current={index === currentIndex ? "step" : undefined}>{index + 1}</button>
                ))}
              </div>
            </details>
          </div>
        </aside>
      </div>
    </main>
  );
}
