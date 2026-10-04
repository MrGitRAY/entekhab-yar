import Link from "next/link";

export default function AssessmentNotFound() {
  return (
    <main className="simple-page">
      <div className="brand"><img className="brand-logo" src="/logo-rahyar.png" alt=""/><span className="brand-copy"><strong>انتخاب‌یار</strong><small>مرکز مشاوره تحصیلی رهیار</small></span></div>
      <h1>آزمون در دسترس نیست</h1>
      <p>ممکن است نشانی درست نباشد یا نشست همین مرورگر دیگر به آزمون دسترسی نداشته باشد.</p>
      <Link className="text-link" href="/">بازگشت به شروع</Link>
    </main>
  );
}
