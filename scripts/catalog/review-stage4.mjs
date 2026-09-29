// One-time, reproducible revision from the preserved 0.1.0 pilot.
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const read = async (p) => JSON.parse(await readFile(new URL(`../../${p}`, import.meta.url), 'utf8'));
const write = async (p, v) => writeFile(new URL(`../../${p}`, import.meta.url), `${JSON.stringify(v, null, 2)}\n`, 'utf8');
const names = ['questions', 'families', 'majors', 'scoring', 'report_templates'];
const c = Object.fromEntries(await Promise.all(names.map(async n => [n, await read(`data/releases/0.1.0-pilot/${n}.json`)])));
const rawPath = 'data/sources/onet-31.0/career_interest_types.json';
const rawBytes = await readFile(new URL(`../../${rawPath}`, import.meta.url));
const raw = JSON.parse(rawBytes);
const axes = ['realistic', 'investigative', 'artistic', 'social', 'enterprising', 'conventional'];
const source = {
  dataset: 'O*NET 31.0 Database', version: '31.0', retrievedAt: '2026-09-27',
  url: 'https://www.onetcenter.org/dl_files/database/db_31_0_json/career_interest_types.json',
  sha256: createHash('sha256').update(rawBytes).digest('hex'),
  license: 'https://creativecommons.org/licenses/by/4.0/',
  attribution: 'O*NET® 31.0 Database, U.S. Department of Labor, Employment and Training Administration (USDOL/ETA), CC BY 4.0. انتخاب‌یار has selected occupations, normalized and averaged ratings, and mapped them to exploratory educational pathways. USDOL/ETA has not approved, endorsed, or tested these modifications.',
};
// These are explicit editorial examples, NOT an official degree-to-occupation crosswalk.
const mapping = {
  medicine: [['29-1215.00', '29-1216.00'], 'دو نمونه پزشکی عمومی و داخلی؛ همه تخصص‌های پزشکی را نمایندگی نمی‌کند.'],
  dentistry: [['29-1021.00'], 'نمونه دندانپزشکی عمومی.'],
  pharmacy: [['29-1051.00'], 'نمونه کار داروساز؛ پژوهش و صنعت دارو پوشش کامل ندارند.'],
  veterinary: [['29-1131.00'], 'نمونه دامپزشکی.'],
  physiotherapy: [['29-1123.00'], 'نمونه فیزیوتراپی.'],
  'occupational-therapy': [['29-1122.00'], 'نمونه کاردرمانی.'],
  'speech-therapy': [['29-1127.00'], 'نمونه آسیب‌شناسی گفتار و زبان.'],
  audiology: [['29-1181.00'], 'نمونه شنوایی‌شناسی.'],
  optometry: [['29-1041.00'], 'نمونه بینایی‌سنجی؛ دامنه مجوز کار در کشورها متفاوت است.'],
  'laboratory-sciences': [['29-2011.00'], 'نمونه فناوری آزمایشگاه پزشکی؛ هم‌ارزی مدرک ادعا نمی‌شود.'],
  radiology: [['29-2034.00'], 'نمونه فناوری تصویربرداری؛ این مدخل تخصص پزشکی رادیولوژی نیست.'],
  'operating-room': [['29-2055.00'], 'نمونه فناوری جراحی؛ شرح وظایف ایران باید جداگانه بررسی شود.'],
  anesthesia: [['29-1071.01'], 'جانشین تقریبی فعالیت‌های کمک به بیهوشی؛ معادل مدرک هوشبری ایران نیست.'],
  biology: [['19-1029.04', '19-1029.02'], 'نمونه زیست‌شناسی عمومی و سلولی؛ همه گرایش‌ها را پوشش نمی‌دهد.'],
  biotechnology: [['19-1021.00', '19-1029.02'], 'نمونه فعالیت پژوهشی زیستی؛ زیست‌فناوری صنعتی و کشاورزی کامل پوشش ندارند.'],
  microbiology: [['19-1022.00'], 'نمونه میکروبیولوژی.'],
  bioinformatics: [['19-1029.01'], 'مسیر تخصصی پژوهش بیوانفورماتیک؛ پذیرش کارشناسی مستقلی تأیید نشده است.'],
  'health-information-technology': [['29-9021.00', '15-1211.01'], 'نمونه فناوری و انفورماتیک سلامت با نقش‌های تحصیلی متفاوت.'],
  psychology: [['19-3033.00', '19-3032.00'], 'دو نمونه بالینی و سازمانی؛ اشتغال تخصصی ممکن است تحصیلات و مجوز بیشتری بخواهد.'],
  counseling: [['21-1012.00', '21-1014.00'], 'نمونه مشاوره تحصیلی و سلامت روان؛ مجوز و شرایط محلی مستقل‌اند.'],
  'educational-sciences': [['25-9031.00'], 'نمونه طراحی و هماهنگی آموزش؛ نماینده همه مشاغل علوم تربیتی نیست.'],
  'computer-engineering': [['17-2061.00', '15-1252.00'], 'دو نمونه سخت‌افزار و توسعه نرم‌افزار.'],
  'computer-science': [['15-1221.00', '15-1252.00'], 'دو نمونه پژوهش رایانه و توسعه نرم‌افزار.'],
  'artificial-intelligence': [['15-1221.00', '15-2051.00'], 'مسیر تخصصی پژوهش رایانه و داده؛ نگاشت رسمی رشته نیست.'],
  'data-science': [['15-2051.00'], 'نمونه شغل دانشمند داده؛ مسیر تخصصی با چند ورودی تحصیلی.'],
  'information-technology': [['15-1211.00', '15-1244.00'], 'نمونه تحلیل سیستم و اداره شبکه.'],
  'electrical-engineering': [['17-2071.00', '17-2072.00'], 'دو نمونه برق و الکترونیک.'],
  'mechanical-engineering': [['17-2141.00'], 'نمونه مهندسی مکانیک.'],
  'civil-engineering': [['17-2051.00'], 'نمونه مهندسی عمران.'],
  'aerospace-engineering': [['17-2011.00'], 'نمونه مهندسی هوافضا.'],
  'materials-engineering': [['17-2131.00'], 'نمونه مهندسی مواد.'],
  architecture: [['17-1011.00'], 'نمونه معماری ساختمان.'],
  'industrial-design': [['27-1021.00'], 'نمونه طراحی محصول تجاری و صنعتی.'],
  'urban-planning': [['19-3051.00'], 'نمونه برنامه‌ریزی شهری و منطقه‌ای.'],
  'industrial-engineering': [['17-2112.00'], 'نمونه مهندسی صنایع.'],
  economics: [['19-3011.00'], 'نمونه پژوهش اقتصادی؛ همه مشاغل فارغ‌التحصیلان اقتصاد نیست.'],
  'it-management': [['11-3021.00'], 'مسیر مدیریت سیستم‌های اطلاعاتی؛ معمولاً نیازمند تجربه پس از تحصیل.'],
  'industrial-management': [['11-3051.00'], 'نمونه مدیریت تولید؛ معمولاً نیازمند تجربه پس از تحصیل.'],
  accounting: [['13-2011.00'], 'نمونه حسابداری و حسابرسی.'],
  mathematics: [['15-2021.00'], 'نمونه پژوهش ریاضی؛ تدریس و مشاغل کاربردی متنوع‌ترند.'],
  statistics: [['15-2041.00'], 'نمونه آمار.'],
  physics: [['19-2012.00'], 'نمونه پژوهش فیزیک؛ همه مشاغل فارغ‌التحصیلان نیست.'],
  'cognitive-science': [['19-3039.02', '15-1221.00'], 'جانشین تقریبی دو مسیر عصب‌روان‌شناسی و محاسبات؛ علوم شناختی بسیار گسترده‌تر است.'],
};
function occupation(code) {
  const rows = raw.row.filter(r => r.onetsoc_code === code && r.scale_id === 'OI');
  if (rows.length !== 6) throw new Error(`Missing source occupation ${code}`);
  const values = Object.fromEntries(rows.map(r => [r.element_name.toLowerCase(), r.data_value]));
  if (axes.some(a => !Number.isFinite(values[a]) || values[a] < 1 || values[a] > 7)) throw new Error(`Invalid source profile ${code}`);
  return { code, title: rows[0].title, rawInterests: values, dateUpdated: rows[0].date_updated, domainSource: rows[0].domain_source };
}
function profile(occupations) {
  return Object.fromEntries(axes.map(a => [a, occupations.reduce((s, o) => s + (o.rawInterests[a] - 1) * 100 / 6, 0) / occupations.length]));
}
for (const n of names) { c[n].catalogVersion = '0.2.0-pilot'; c[n].schemaVersion = 2; }
const revisions = {
  'Q-R-02': 'از کار کردن با ابزار برای تعمیر یک وسیله لذت می‌برم.',
  'Q-R-06': 'دوست دارم با تصویر، نوشته یا موسیقی چیزی خلق کنم.',
  'Q-R-07': 'از گوش دادن به دیگران برای کمک به حل مسئله‌شان لذت می‌برم.',
  'Q-R-10': 'هدایت یک گروه برای رسیدن به هدف مشترک برایم جذاب است.',
  'Q-R-11': 'معرفی یک محصول یا ایده به دیگران برای جلب حمایتشان را دوست دارم.',
  'Q-R-13': 'از دسته‌بندی اطلاعات طبق یک روش مشخص لذت می‌برم.',
  'Q-R-14': 'بررسی دقیق فهرست‌ها برای پیدا کردن اشتباه را دوست دارم.',
  'Q-MAT-01': 'ساختن یک قطعه یا سرهم کردن یک وسیله برایم جذاب است.',
  'Q-MAT-03': 'از طراحی ظاهر تازه برای یک محصول لذت می‌برم.',
};
for (const q of c.questions.items) {
  if (revisions[q.id]) q.text = revisions[q.id];
  q.evidenceStatus = 'authored_pilot_not_validated';
}
c.questions.measurementStatus = 'unvalidated_fa_student_pilot';
c.questions.review = { date: '2026-09-27', scope: 'desk_content_review_only', humanExpertReview: 'pending', cognitiveInterviews: 'pending', empiricalValidation: 'pending', revisedIds: Object.keys(revisions) };
for (const m of c.majors.items) {
  const [codes, rationale] = mapping[m.id];
  delete m.profile;
  m.profileStatus = 'occupation_proxy_unvalidated';
  m.occupations = codes.map(occupation);
  m.interestProfile = profile(m.occupations);
  m.mapping = { status: 'editorial_pending_expert_review', rationale, method: 'equal_mean_selected_occupations' };
  if (m.id === 'radiology') m.title = 'تکنولوژی پرتوشناسی (تصویربرداری)';
}
c.majors.profileSource = source;
for (const f of c.families.items) {
  delete f.profile;
  f.profileStatus = 'occupation_proxy_unvalidated';
  const codes = [...new Set(c.majors.items.filter(m => m.familyId === f.id).flatMap(m => m.occupations.map(o => o.code)))].sort();
  f.occupationCodes = codes;
  f.interestProfile = profile(codes.map(occupation));
  f.aggregation = 'equal_mean_unique_occupations';
}
c.scoring.sectionWeights = { riasec: 1, personality: 0, values: 0, abilities: 0, workstyle: 0 };
c.scoring.method = 'riasec_profile_correlation_v1';
c.scoring.engineVersion = '0.2.0';
c.scoring.ranking.tieBreaker = 'id_ascending';
c.scoring.dimensionWeights = Object.fromEntries(axes.map(a => [a, 1]));
c.scoring.weightEvidence = { status: 'policy_not_empirically_calibrated', rationale: 'Equal RIASEC dimensions; unsupported cross-construct composite weights removed. Other sections remain descriptive.' };
c.scoring.sensitivity = { answerStep: 1, dimensionWeightRelativeChange: 0.2, interpretation: 'deterministic_scenarios_not_confidence_interval' };
c.scoring.scoreMeaning = 'شاخص شباهت الگوی رغبت از ۰ تا ۱۰۰؛ احتمال قبولی، موفقیت یا درصد استعداد نیست.';
c.scoring.releaseGate = { status: 'pilot_only', questionnaireValidation: 'pending', crosswalkExpertReview: 'pending', iranAdmissionVerification: 'pending' };
c.scoring.dimensions.find(d => d.id === 'emotional_stability').label = 'آرامش خودگزارشی در فشار';
c.report_templates.labels.matchScore = 'شباهت الگوی رغبت';
c.report_templates.labels.strengths = 'رغبت‌های همسو';
c.report_templates.audiences.counselor.disclaimer = 'پرسش‌نامه فارسی و نگاشت رشته به شغل هنوز اعتبارسنجی نشده‌اند. شاخص شباهت و تحلیل حساسیت، احتمال موفقیت یا ضریب اطمینان روان‌سنجی نیستند.';
for (const n of names) await write(`data/${n}.json`, c[n]);
await write('data/sources/onet-31.0/provenance.json', source);
console.log('Created 0.2.0-pilot from archived 0.1.0-pilot and pinned O*NET source.');
