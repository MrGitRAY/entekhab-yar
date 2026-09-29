"use client";

import Link from "next/link";

export default function AssessmentError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="simple-page">
      <div className="brand"><span className="brand-mark" aria-hidden="true">ا</span><span>انتخاب‌یار</span></div>
      <h1>بارگذاری آزمون انجام نشد</h1>
      <p>اتصال را بررسی کنید و دوباره تلاش کنید. پاسخ‌های ذخیره‌شده شما باقی می‌مانند.</p>
      <button className="primary-button" type="button" onClick={() => reset()}>تلاش دوباره</button>
      <p><Link className="text-link" href="/">بازگشت به شروع</Link></p>
    </main>
  );
}
