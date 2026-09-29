import Link from "next/link";

export default function AssessmentNotFound() {
  return (
    <main className="simple-page">
      <div className="brand"><span className="brand-mark" aria-hidden="true">ا</span><span>انتخاب‌یار</span></div>
      <h1>آزمون در دسترس نیست</h1>
      <p>ممکن است نشانی درست نباشد یا نشست همین مرورگر دیگر به آزمون دسترسی نداشته باشد.</p>
      <Link className="text-link" href="/">بازگشت به شروع</Link>
    </main>
  );
}
