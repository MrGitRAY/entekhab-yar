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
        <span className="step-tag">ورود به آزمون</span>
        <h1 id="access-title">رمز ورود مرکز مشاوره را وارد کن</h1>
        <p>این آزمون برای افرادی است که رمز را از مرکز مشاوره تحصیلی رهیار دریافت کرده‌اند.</p>
        <AccessForm next={next} />
      </section>
    </main>
  );
}
