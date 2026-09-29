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
    <p><strong>رغبت‌های همسو: </strong>{aligned.length ? aligned.map(x => x.label).join("، ") : "همسویی برجسته‌ای در رغبت‌های بالاتر دیده نشد؛ جزئیات را بررسی کن."}</p>
    {different.length > 0 && <p><strong>برای گفت‌وگو: </strong>جایگاه نسبی {different.map(x => x.label).join(" و ")} در پاسخ‌های تو با این مسیر متفاوت است.</p>}
  </div>;
}

export function ResultView({ result: r, displayName, reportHref, summaryHref, pdfHref, detailed = false, preview = false }: { result: ResultSnapshot; displayName: string; reportHref: string; summaryHref: string; pdfHref?: string; detailed?: boolean; preview?: boolean }) {
  const flat = r.status === "insufficient_interest_differentiation";
  return <main className="result-shell">
    <header className="result-nav"><Link href="/" className="brand"><span className="brand-mark" aria-hidden="true">ا</span>انتخاب‌یار</Link><span>{preview ? "پیش‌نمایش محلی · " : ""}نسخهٔ پژوهشی</span></header>
    <section className="result-hero"><span className="step-tag">{detailed ? "گزارش تفصیلی برای گفت‌وگو با مشاور" : "یک نقطهٔ شروع برای شناخت مسیرها"}</span>
      <h1>{displayName}، {detailed ? "جزئیات نتیجه‌ات اینجاست." : "مسیرت را آگاهانه‌تر بررسی کن."}</h1>
      <p>{r.explanations.title}</p><p className="result-subtitle">گروه {r.examGroup === "experimental" ? "تجربی" : "ریاضی"} · ۶۰ پاسخ · {r.method.scoreMeaning}</p>
      <div className="button-row"><Link className="secondary-button" href={detailed ? summaryHref : reportHref}>{detailed ? "بازگشت به خلاصه" : "دیدن گزارش تفصیلی و مبنای محاسبه"} ←</Link>{detailed && pdfHref && <a className="secondary-button" href={pdfHref}>دانلود گزارش PDF ↓</a>}{detailed && !pdfHref && preview && <PrintButton/>}</div>
    </section>
    <section className="evidence-note" aria-labelledby="evidence-title"><h2 id="evidence-title">این نتیجه چقدر قابل اتکاست؟</h2><ul>{r.explanations.notices.map(n => <li key={n}>{n}</li>)}</ul></section>
    <section className="result-section"><div className="section-heading"><h2>نقشهٔ رغبت‌های تو</h2><span>خودگزارشی، بدون مقایسه با جمعیت</span></div>
      <div className="interest-grid">{Object.entries(r.profile).filter(([,d]) => d.section === "riasec").map(([id,d]) => <div className="interest-item" key={id}><div><strong>{d.label}</strong><span>{number(d.score)}</span></div><div className="interest-bar" aria-hidden="true"><span style={{ width: `${d.score}%` }}/></div><small>{number(d.itemCount)} سؤال · دامنه ۰ تا ۱۰۰</small></div>)}</div>
      <p className="result-caption">نمره بالاتر یعنی موافقت بیشتر با فعالیت‌های آن محور. این نمره، درصد استعداد یا صدک جمعیت نیست. هر محور فقط سه سؤال دارد.</p>
    </section>
    {!flat && <><section className="result-section"><h2>سه خانواده برای بررسی بیشتر</h2><div className="family-cards">{r.topFamilies.map(f => <article key={f.id}><span className="rank-label">رتبه {number(f.rank!)}</span><h3>{f.title}</h3><p>{f.description}</p><strong className="match-number">{score(f.score)}</strong><Reasons item={f}/></article>)}</div></section>
      <section className="result-section"><h2>پنج رشته و مسیر پیشنهادی برای بررسی</h2><p className="result-caption">از سه خانوادهٔ بالا انتخاب شده‌اند. فهرست کامل ممکن است گزینه‌های نزدیک دیگری داشته باشد.</p><div className="major-cards">{r.topMajors.map((m,i) => {
        const sensitivity = r.sensitivity.majorRanges.find(s => s.id === m.id);
        return <article key={m.id}><div className="major-heading"><span className="candidate-number">{number(i+1)}</span><div><span className="result-caption">{m.kind === "pathway" ? "مسیر تخصصی" : "عنوان رشته؛ پذیرش تأیید نشده"}</span><h3>{m.title}</h3></div><strong className="match-number">{score(m.score)}</strong></div><Reasons item={m}/>
          {sensitivity && <p className="sensitivity-line">با تغییرهای کوچک: رتبهٔ کل بین {number(sensitivity.minRank)} تا {number(sensitivity.maxRank)}؛ حضور در پنج پیشنهاد در {number(sensitivity.selectedCount)} از {number(r.sensitivity.scenarioCount)} حالت بررسی‌شده.</p>}
          <details><summary>شغل‌های نمونه و محدودیت نگاشت</summary><p>{m.mappingRationale}</p><ul>{m.occupations?.map(o => <li key={o.code}><a href={`https://www.onetonline.org/link/summary/${o.code}`} target="_blank" rel="noreferrer"><bdi>{o.title} ({o.code})</bdi></a></li>)}</ul></details>
        </article>;
      })}</div></section></>}
    {flat && <section className="result-section"><h2>فعلاً پیشنهاد رتبه‌دار نداریم</h2><p>برای روشن‌تر شدن رغبت‌ها، چند فعالیت واقعی را تجربه کن و دربارهٔ فعالیت‌های خوشایند و ناخوشایندت با مشاور صحبت کن. نتیجهٔ مساوی به معنی نداشتن علاقه یا توانایی نیست.</p></section>}
    <section className="result-section"><h2>پایداری پیشنهادها در برابر تغییر</h2><p>{r.sensitivity.interpretation}</p><p>{flat ? "با نبود تفاوت میان رغبت‌ها، تحلیل رتبه اجرا نشده است." : `${number(r.sensitivity.answerScenarioCount)} حالت تغییر پاسخ و ${number(r.sensitivity.weightScenarioCount)} حالت تغییر وزن بررسی شد. در ${number(r.sensitivity.unrankableScenarios)} حالت، رتبه‌بندی ممکن نبود.`}</p></section>
    {detailed && <>
      <section className="result-section"><h2>همهٔ محورهای خودگزارشی</h2><p>فقط شش رغبت در رتبه‌بندی نقش دارند. سایر نمره‌ها برای پرسیدن سؤال‌های بیشتر در جلسهٔ مشاوره‌اند؛ شواهد کافی برای ترکیب آن‌ها با امتیاز رشته نداریم.</p><div className="table-scroll"><table><thead><tr><th>بخش</th><th>محور</th><th>نمره از ۱۰۰</th><th>تعداد سؤال</th><th>کاربرد</th></tr></thead><tbody>{Object.entries(r.profile).map(([id,d]) => <tr key={id}><td>{sections[d.section]}</td><th scope="row">{d.label}</th><td>{number(d.score)}</td><td>{number(d.itemCount)}</td><td>{d.section === "riasec" ? "تطبیق اکتشافی" : "توصیفی"}</td></tr>)}</tbody></table></div></section>
      <RankingTable title="رتبه‌بندی همهٔ خانواده‌ها" items={r.familyRanking}/><RankingTable title="رتبه‌بندی همهٔ رشته‌ها و مسیرهای این گروه" items={r.majorRanking}/>
      <section className="result-section"><h2>محاسبه و وزن‌ها</h2><p>پاسخ‌های مثبت با فرمول (پاسخ − ۱) × ۲۵ و پاسخ‌های معکوس با (۵ − پاسخ) × ۲۵ تبدیل می‌شوند. میانگین وزنی سؤال‌های هر محور، نمرهٔ آن محور است. شش رغبت وزن برابر دارند؛ همبستگی پروفایل فرد و پروفایل شغل‌های نمونه به شاخص ۵۰ × (۱ + r) تبدیل می‌شود.</p><p>وزن رتبه‌بندی: رغبت‌ها ۱۰۰٪؛ شخصیت، ارزش‌ها، توانایی خودگزارشی و سبک کار ۰٪. این انتخاب فعلی محصول است و وزن استاندارد جهانی یا وزن کالیبره‌شده نیست. برابری نمره‌های دقیق با رتبه برابر نشان داده می‌شود؛ ترتیب نمایش با شناسه ثابت می‌ماند.</p>
      <p>پروفایل هر مسیر میانگین برابر شغل‌های نمونه است؛ پروفایل خانواده میانگین شغل‌های یکتای اعضای آن است. این میانگین‌گیری و فیلتر سه خانواده، تصمیم‌های طراحی محصول‌اند.</p></section>
      <section className="result-section"><h2>پرسش‌های مناسب برای جلسهٔ مشاوره</h2><ul><li>کدام فعالیت‌های واقعی، پاسخ‌های رغبت را تأیید یا رد می‌کنند؟</li><li>برای ارزیابی مهارت، چه نمونه‌کار، نمرهٔ درسی یا آزمون عملکردی در دسترس است؟</li><li>آیا شرح کار روزمره، ارزش‌ها و محدودیت‌های زندگی با انتخاب مورد نظر سازگارند؟</li><li>آیا عنوان، مقطع، شرایط پذیرش و مجوز حرفه‌ای در منابع رسمی همان سال تأیید شده‌اند؟</li></ul></section>
    </>}
    <footer className="result-footer"><p>{r.explanations.interpretation}</p><p><a href="https://www.onetcenter.org/database.html">دادهٔ شغلی O*NET® {r.evidence.source.version}</a> از USDOL/ETA با مجوز <a href={r.evidence.source.license}>CC BY 4.0</a>. انتخاب‌یار شغل‌ها را انتخاب، نمره‌ها را تبدیل و میانگین‌گیری کرده و به مسیرهای تحصیلی نگاشت کرده است؛ این تغییرات مورد تأیید یا آزمون USDOL/ETA نیستند.</p><p>نسخهٔ داده: <bdi>{r.catalogVersion}</bdi> · موتور: <bdi>{r.engineVersion}</bdi></p>{detailed && r.integrity && <details><summary>شناسه‌های بازتولید نتیجه</summary><p>داده: <code>{r.integrity.catalogSha256}</code></p><p>پاسخ‌ها: <code>{r.integrity.answersSha256}</code></p></details>}</footer>
  </main>;
}

function RankingTable({ title, items }: { title: string; items: Ranking[] }) {
  return <section className="result-section"><h2>{title}</h2><div className="table-scroll"><table><thead><tr><th>رتبه</th><th>عنوان</th><th>شباهت</th><th>جزئیات محاسبه</th></tr></thead><tbody>{items.map(item => <tr key={item.id}><td>{item.rank === null ? "—" : number(item.rank)}</td><th scope="row">{item.title}</th><td>{score(item.score)}</td><td>{item.score === null ? <span>همبستگی برای این پروفایل تعریف نمی‌شود.</span> : <details><summary>سهم محورها</summary><p>جمع سهم‌ها برابر همبستگی است. سهم مثبت می‌تواند از پایین بودن مشترک یک رغبت هم بیاید و به معنی نقطه قوت نیست.</p><ul>{item.contributions.map(c => <li key={c.dimension}>{c.label}: فرد {number(c.userScore)}، هدف {number(c.targetScore)}، سهم <bdi>{c.contribution.toFixed(3)}</bdi></li>)}</ul>{item.mappingRationale && <p>{item.mappingRationale}</p>}</details>}</td></tr>)}</tbody></table></div></section>;
}


