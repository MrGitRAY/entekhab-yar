import { StartForm } from "@/features/assessment/start-form";
import { publicSupabaseConfig } from "@/infrastructure/supabase/config";

export default function HomePage() {
  const configured = Boolean(publicSupabaseConfig());
  return (
    <main className="landing-shell">
      <div className="landing-layout">
        <section className="intro-panel" aria-labelledby="intro-title">
          <div className="brand"><img className="brand-logo" src="/logo-rahyar.png" alt=""/><span>انتخاب‌یار</span><small>مرکز مشاوره تحصیلی رهیار</small></div>
          <div className="intro-content">
            <p className="eyebrow">برای تجربی و ریاضی</p>
            <h1 id="intro-title">از شناخت خودت شروع کن.</h1>
            <p className="intro-text">به چند پرسش کوتاه درباره علاقه‌ها، شیوه یادگیری و چیزهایی که در آینده برایت مهم‌اند پاسخ بده. بعد از آزمون، مسیرهایی برای بررسی بیشتر می‌بینی.</p>
          </div>
          <div className="intro-footnote">
            <span className="footnote-line" aria-hidden="true" />
            <p>این آزمون اکتشافی است و جایگزین اطلاعات رسمی پذیرش یا گفت‌وگو با مشاور نیست.</p>
          </div>
        </section>
        <section className="start-panel" aria-labelledby="start-title">
          <div className="panel-heading">
            <span className="step-tag">شروع آزمون</span>
            <h2 id="start-title">اول، چند چیز درباره خودت</h2>
            <p>این اطلاعات فقط برای مسیر همین آزمون استفاده می‌شود.</p>
          </div>
          <StartForm configured={configured} />
        </section>
      </div>
    </main>
  );
}
