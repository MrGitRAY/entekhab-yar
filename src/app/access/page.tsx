import { AccessForm } from "@/features/access/access-form";

export const dynamic = "force-dynamic";

export default async function AccessPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const params = await searchParams;
  const next = typeof params.next === "string" && params.next.startsWith("/") && !params.next.startsWith("//")
    ? params.next : "/";
  return (
    <main className="access-shell">
      <section className="access-card" aria-labelledby="access-title">
        <div className="brand access-brand"><img className="brand-logo" src="/logo-rahyar.png" alt="" /><span className="brand-copy"><strong>انتخاب‌یار</strong><small>مرکز مشاوره تحصیلی رهیار</small></span></div>
        <div className="access-message-icon" aria-hidden="true">🔐</div>
        <span className="step-tag">پیام مرکز مشاوره</span>
        <h1 id="access-title">برای ورود به آزمون، رمز مرکز را وارد کن</h1>
        <p>این آزمون برای دانش‌آموزانی است که رمز ورود را از مرکز مشاوره تحصیلی رهیار دریافت کرده‌اند.</p>
        <AccessForm next={next} />
      </section>
    </main>
  );
}
