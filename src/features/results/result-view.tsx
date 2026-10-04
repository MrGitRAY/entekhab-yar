import Link from "next/link";
import type { Ranking, ResultSnapshot } from "@/domain/matching/types";
import { PrintButton } from "./print-button";
const number = (n: number) => n.toLocaleString("fa-IR", { maximumFractionDigits: 1 });
const score = (n: number | null) => n === null ? "محاسبه نشد" : `${Math.round(n).toLocaleString("fa-IR")} از ۱۰۰`;
const sections: Record<string, string> = { riasec: "رغبت‌ها", personality: "ویژگی‌های فردی خودگزارشی", values: "ارزش‌ها", abilities: "برداشت از شیوه یادگیری و کار", workstyle: "سبک کار" };

function Reasons({ item }: { item: Ranking }) {
  const aligned = item.contributions.filter(x => x.relationship === "shared_higher").sort((a,b) => b.contribution - a.contribution).slice(0,2);
  const different = item.contributions.filter(x => x.relationship === "different").sort((a,b) => a.contribution - b.contribution).slice(0,2);
  return <div className="result-reasons">
    <p><strong>محورهای همسو: </strong>{aligned.length ? aligned.map(x => x.label).join("، ") : "همسویی برجسته‌ای در محورهای بالاتر دیده نشد؛ جزئیات را بررسی کن."}</p>
    {different.length > 0 && <p><strong>برای گفت‌وگو: </strong>جایگاه نسبی {different.map(x => x.label).join(" و ")} در پاسخ‌های تو با این مسیر متفاوت است.</p>}
  </div>;
}

function FamilyMajorList({ items }: { items: Ranking[] }) {
  if (!items.length) return <p className="result-caption">رشته‌ای برای این خانواده ثبت نشده است.</p>;
  return <div className="family-major-list"><strong>رشته‌های این خانواده</strong>{items.slice(0, 5).map((major) => <div className="family-major-row" key={major.id}><span>{major.title}</span><span>{score(major.score)}</span></div>)}</div>;
}

export function ResultView({ result: r, displayName, reportHref, summaryHref, pdfHref, detailed = false, preview = false }: { result: ResultSnapshot; displayName: string; reportHref: string; summaryHref: string; pdfHref?: string; detailed?: boolean; preview?: boolean }) {
  const flat = r.status === "insufficient_interest_differentiation";
  return <main className="result-shell">
    <header className="result-nav"><Link href="/" className="brand"><img className="brand-logo" src="/logo-rahyar.png" alt=""/><span className="brand-copy"><strong>انتخاب‌یار</strong><small>مرکز مشاوره تحصیلی رهیار</small></span></Link><span>{preview ? "پیش‌نمایش محلی · " : ""}نسخهٔ پژوهشی</span></header>
    <section className="result-hero"><span className="step-tag">{detailed ? "گزارش تفصیلی برای گفت‌وگو با مشاور" : "یک نقطهٔ شروع برای شناخت مسیرها"}</span>
      <h1>{displayName}، {detailed ? "جزئیات نتیجه‌ات اینجاست." : "مسیرت را آگاهانه‌تر بررسی کن."}</h1>
      <p>{r.explanations.title}</p><p className="result-subtitle">گروه {r.examGroup === "experimental" ? "تجربی" : "ریاضی"} · ۷۰ پاسخ · {r.method.scoreMeaning}</p>
      <div className="button-row"><Link className="secondary-button" href={detailed ? summaryHref : reportHref}>{detailed ? "بازگشت به خلاصه" : "دیدن گزارش تفصیلی و مبنای محاسبه"} ←</Link>{pdfHref && <a className="primary-button" href={pdfHref}>دانلود گزارش PDF ↓</a>}{!pdfHref && preview && <PrintButton/>}</div>
    </section>
    <section className="evidence-note" aria-labelledby="evidence-title"><h2 id="evidence-title">این نتیجه چقدر قابل اتکاست؟</h2><ul>{r.explanations.notices.map(n => <li key={n}>{n}</li>)}</ul></section>
    <section className="result-section"><div className="section-heading"><h2>نقشهٔ رغبت‌های تو</h2><span>خودگزارشی، بدون مقایسه با جمعیت</span></div>
      <div className="interest-grid">{Object.entries(r.profile).filter(([,d]) => d.section === "riasec").map(([id,d]) => <div className="interest-item" key={id}><div><strong>{d.label}</strong><span>{number(d.score)}</span></div><div className="interest-bar" aria-hidden="true"><span style={{ width: `${d.score}%` }}/></div><small>{number(d.itemCount)} سؤال · دامنه ۰ تا ۱۰۰</small></div>)}</div>
      <p className="result-caption">نمره بالاتر یعنی موافقت بیشتر با فعالیت‌های آن محور. این نمره، درصد استعداد یا صدک جمعیت نیست. هر محور رغبت سه سؤال و هر بُعد شخصیت چهار سؤال دارد.</p>
    </section>
    {!flat && <section className="result-section"><div className="section-heading"><h2>خانواده‌های برتر و رشته‌های آن‌ها</h2><span>امتیاز خانواده و رشته‌ها کنار هم</span></div><div className="family-cards">{r.topFamilies.map(f => {
      const familyMajors = r.majorRanking.filter((major) => major.familyId === f.id);
      return detailed
        ? <details className="family-card" key={f.id}><summary><span><span className="rank-label">رتبه {number(f.rank!)}</span><strong className="family-summary-title">{f.title}</strong></span><strong className="match-number">{score(f.score)}</strong></summary><div className="family-card-body"><p>{f.description}</p><FamilyMajorList items={familyMajors}/><Reasons item={f}/></div></details>
        : <article key={f.id}><span className="rank-label">رتبه {number(f.rank!)}</span><h3>{f.title}</h3><strong className="match-number">{score(f.score)}</strong><FamilyMajorList items={familyMajors}/><details className="card-details"><summary>چرا این خانواده؟</summary><p>{f.description}</p><Reasons item={f}/></details></article>;
    })}</div></section>}
    {!flat && <RankingTable title="رتبه‌بندی مستقل همهٔ رشته‌ها و مسیرهای این گروه" items={r.majorRanking} collapsible={!detailed}/>}
    {flat && <section className="result-section"><h2>فعلاً پیشنهاد رتبه‌دار نداریم</h2><p>برای روشن‌تر شدن رغبت‌ها، چند فعالیت واقعی را تجربه کن و دربارهٔ فعالیت‌های خوشایند و ناخوشایندت با مشاور صحبت کن. نتیجهٔ مساوی به معنی نداشتن علاقه یا توانایی نیست.</p></section>}
    <section className="result-section"><h2>پایداری پیشنهادها در برابر تغییر</h2><p>{r.sensitivity.interpretation}</p><p>{flat ? "با نبود تفاوت میان رغبت‌ها، تحلیل رتبه اجرا نشده است." : `${number(r.sensitivity.answerScenarioCount)} حالت تغییر پاسخ و ${number(r.sensitivity.weightScenarioCount)} حالت تغییر وزن بررسی شد. در ${number(r.sensitivity.unrankableScenarios)} حالت، رتبه‌بندی ممکن نبود.`}</p></section>
    {detailed && <>
      <section className="result-section"><h2>همهٔ محورهای خودگزارشی</h2><p>رغبت‌ها، شخصیت و ارزش‌ها با سهم محدود در شاخص سازگاری اکتشافی نقش دارند. توانایی‌های خودگزارشی و سبک کار فعلاً توصیفی‌اند و وارد رتبه‌بندی نشده‌اند.</p><div className="table-scroll"><table><thead><tr><th>بخش</th><th>محور</th><th>نمره از ۱۰۰</th><th>تعداد سؤال</th><th>کاربرد</th></tr></thead><tbody>{Object.entries(r.profile).map(([id,d]) => <tr key={id}><td>{sections[d.section]}</td><th scope="row">{d.label}</th><td>{number(d.score)}</td><td>{number(d.itemCount)}</td><td>{["riasec", "personality", "values"].includes(d.section) ? "تطبیق اکتشافی" : "توصیفی"}</td></tr>)}</tbody></table></div></section>
      <RankingTable title="رتبه‌بندی همهٔ خانواده‌ها" items={r.familyRanking}/>
      <section className="result-section"><h2>محاسبه و وزن‌ها</h2><p>پاسخ‌های مثبت با فرمول (پاسخ − ۱) × ۲۵ و پاسخ‌های معکوس با (۵ − پاسخ) × ۲۵ تبدیل می‌شوند. میانگین وزنی سؤال‌های هر محور، نمرهٔ آن محور است. امتیاز هر خانواده و رشته از همبستگی وزن‌دار پروفایل داوطلب با پروفایل هدف آن مسیر به شاخص ۰ تا ۱۰۰ تبدیل می‌شود.</p><p>وزن بخش‌ها در این نسخهٔ پایلوت: رغبت‌ها ۷۰٪، شخصیت ۱۸٪ و ارزش‌ها ۱۲٪؛ ابعاد داخل هر بخش وزن برابر دارند. پروفایل‌های هدف شخصیت و ارزش‌ها آرکی‌تایپ تحریریه‌ای خانواده‌اند و هنوز با دادهٔ دانش‌آموزان ایرانی کالیبره نشده‌اند؛ این امتیاز احتمال قبولی یا موفقیت نیست.</p>
      <p>پروفایل رشته‌های هر خانواده در این نسخه از آرکی‌تایپ خانواده به ارث می‌رسد و با پروفایل شش‌محوری شغل‌های نمونه ترکیب می‌شود. سه خانوادهٔ برتر برای کارت اول انتخاب می‌شوند و رتبه‌بندی مستقل همهٔ رشته‌ها جداگانه نمایش داده می‌شود.</p></section>
      <section className="result-section"><h2>پرسش‌های مناسب برای جلسهٔ مشاوره</h2><ul><li>کدام فعالیت‌های واقعی، پاسخ‌های رغبت را تأیید یا رد می‌کنند؟</li><li>برای ارزیابی مهارت، چه نمونه‌کار، نمرهٔ درسی یا آزمون عملکردی در دسترس است؟</li><li>آیا شرح کار روزمره، ارزش‌ها و محدودیت‌های زندگی با انتخاب مورد نظر سازگارند؟</li><li>آیا عنوان، مقطع، شرایط پذیرش و مجوز حرفه‌ای در منابع رسمی همان سال تأیید شده‌اند؟</li></ul></section>
    </>}
    <footer className="result-footer"><p>{r.explanations.interpretation}</p><p><a href="https://www.onetcenter.org/database.html">دادهٔ شغلی O*NET® {r.evidence.source.version}</a> از USDOL/ETA با مجوز <a href={r.evidence.source.license}>CC BY 4.0</a>. انتخاب‌یار شغل‌ها را انتخاب، نمره‌ها را تبدیل و میانگین‌گیری کرده و به مسیرهای تحصیلی نگاشت کرده است؛ این تغییرات مورد تأیید یا آزمون USDOL/ETA نیستند.</p><p>نسخهٔ داده: <bdi>{r.catalogVersion}</bdi> · موتور: <bdi>{r.engineVersion}</bdi></p>{detailed && r.integrity && <details><summary>شناسه‌های بازتولید نتیجه</summary><p>داده: <code>{r.integrity.catalogSha256}</code></p><p>پاسخ‌ها: <code>{r.integrity.answersSha256}</code></p></details>}</footer>
  </main>;
}

function RankingTable({ title, items, collapsible = false }: { title: string; items: Ranking[]; collapsible?: boolean }) {
  const content = <><div className="table-scroll"><table><thead><tr><th>رتبه</th><th>عنوان</th><th>شباهت</th><th>جزئیات محاسبه</th></tr></thead><tbody>{items.map(item => <tr key={item.id}><td>{item.rank === null ? "—" : number(item.rank)}</td><th scope="row">{item.title}</th><td>{score(item.score)}</td><td>{item.score === null ? <span>همبستگی برای این پروفایل تعریف نمی‌شود.</span> : <details><summary>سهم محورها</summary><p>سهم مثبت نشان‌دهندهٔ هم‌جهتی نسبی این محور با پروفایل هدف است؛ تشخیص توانایی یا علت موفقیت نیست.</p><ul>{item.contributions.map(c => <li key={c.dimension}>{c.label}: فرد {number(c.userScore)}، هدف {number(c.targetScore)}، سهم <bdi>{c.contribution.toFixed(3)}</bdi></li>)}</ul>{item.mappingRationale && <p>{item.mappingRationale}</p>}</details>}</td></tr>)}</tbody></table></div></>;
  return <section className="result-section ranking-section">{collapsible ? <details className="ranking-disclosure"><summary><h2>{title}</h2><span>برای دیدن همهٔ رشته‌ها باز کنید</span></summary>{content}</details> : <><h2>{title}</h2>{content}</>}</section>;
}


