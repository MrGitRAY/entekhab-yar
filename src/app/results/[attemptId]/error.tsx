"use client";
export default function ErrorPage({ reset }: { reset: () => void }) { return <main className="simple-page"><h1>گزارش بارگذاری نشد</h1><p>پاسخ‌های شما محفوظ‌اند.</p><button className="primary-button" onClick={reset}>تلاش دوباره</button></main>; }
