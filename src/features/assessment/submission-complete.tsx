"use client";

import Link from "next/link";
import { EvaluateButton } from "@/features/results/evaluate-button";

type Props = { attemptId: string; displayName: string; preview?: boolean };

export function SubmissionComplete({ attemptId, displayName, preview = false }: Props) {
  return (
    <main className="submission-page">
      <section className="submission-card" aria-labelledby="submission-title">
        <header className="submission-header">
          <div className="brand"><img className="brand-logo" src="/logo-rahyar.png" alt=""/><span className="brand-copy"><strong>انتخاب‌یار</strong><small>مرکز مشاوره تحصیلی رهیار</small></span></div>
          <span className="submission-status"><span aria-hidden="true"/>آزمون کامل شد</span>
        </header>
        <div className="submission-layout">
          <div className="submission-content">
            <div className="submission-intro"><span className="success-icon" aria-hidden="true">✓</span><span className="submission-kicker">پایان آزمون</span></div>
            <h1 id="submission-title">{preview ? "پیش‌نمایش را کامل کردی" : "پاسخ‌هایت ثبت شد"}، {displayName}.</h1>
            <p>{preview ? "پاسخ‌ها در همین مرورگر ذخیره شده‌اند و نتیجهٔ اکتشافی آمادهٔ نمایش است." : "همهٔ پاسخ‌ها ذخیره شدند. اکنون می‌توانی نتیجهٔ اکتشافی خود را ببینی."}</p>
          </div>
          <div className="submission-next">
            <span className="submission-next-label">گام بعدی</span>
            <h2>دیدن نتیجهٔ آزمون</h2>
            <p>نتیجه بر پایهٔ پاسخ‌هایی که ثبت کردی محاسبه می‌شود.</p>
            <EvaluateButton attemptId={attemptId} preview={preview}/>
            <Link className="text-link" href="/">بازگشت به شروع</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
