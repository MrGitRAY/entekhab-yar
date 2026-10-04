import fs from "node:fs";
import path from "node:path";
import { Font, Page, Text, View, Document, StyleSheet, Svg, Circle } from "@react-pdf/renderer";
import type { Ranking, ResultSnapshot } from "@/domain/matching/types";

const fontRoot = path.join(process.cwd(), "public", "fonts");
if (!fs.existsSync(path.join(fontRoot, "Vazirmatn-FD-Regular.ttf")) || !fs.existsSync(path.join(fontRoot, "Vazirmatn-FD-Bold.ttf"))) {
  console.error(`PDF font files are missing from ${fontRoot}`);
}

Font.register({
  family: "Vazirmatn",
  fonts: [
    { src: path.join(fontRoot, "Vazirmatn-FD-Regular.ttf"), fontWeight: 400 },
    { src: path.join(fontRoot, "Vazirmatn-FD-Bold.ttf"), fontWeight: 700 },
  ],
});

const styles = StyleSheet.create({
  page: { padding: 42, fontFamily: "Vazirmatn", fontSize: 10, color: "#172033", direction: "rtl", textAlign: "right", lineHeight: 1.65 },
  firstPage: { paddingTop: 28, paddingBottom: 28 },
  header: { borderBottom: "2 solid #1e6b63", paddingBottom: 14, marginBottom: 20, textAlign: "right" },
  brand: { fontSize: 23, fontWeight: 700, color: "#155e59", lineHeight: 1.5, marginBottom: 10, textAlign: "right" },
  meta: { color: "#657084", lineHeight: 1.5, textAlign: "right" },
  title: { fontSize: 17, fontWeight: 700, color: "#172033", marginBottom: 8, textAlign: "right" },
  section: { marginTop: 14, padding: 13, borderRadius: 8, backgroundColor: "#f5f8f7", textAlign: "right" },
  sectionTitle: { fontSize: 13, fontWeight: 700, color: "#155e59", marginBottom: 7, textAlign: "right" },
  paragraph: { marginBottom: 7, textAlign: "justify", direction: "rtl" },
  shortParagraph: { marginBottom: 7, textAlign: "right", direction: "rtl" },
  rightParagraph: { marginBottom: 7, textAlign: "right", direction: "rtl" },
  noticeRow: { flexDirection: "row-reverse", alignItems: "flex-start", marginBottom: 6 },
  noticeBullet: { marginLeft: 7, color: "#49566b" },
  notice: { flexGrow: 1, flexShrink: 1, color: "#49566b", textAlign: "right", direction: "rtl" },
  card: { marginBottom: 9, padding: 10, backgroundColor: "#ffffff", border: "1 solid #dce7e3", borderRadius: 6 },
  cardTitleRow: { flexDirection: "row-reverse", alignItems: "center" },
  cardIndex: { fontSize: 11, fontWeight: 700, color: "#172033", marginLeft: 5 },
  cardTitle: { fontSize: 11, fontWeight: 700, color: "#172033", textAlign: "right" },
  metricWrap: { flexDirection: "row-reverse", alignItems: "center", marginTop: 3 },
  metricLine: { flexDirection: "row-reverse", alignItems: "center" },
  metricPiece: { marginLeft: 4 },
  scorePiece: { fontSize: 11, fontWeight: 700, color: "#b45c32", marginLeft: 4 },
  ring: { width: 28, height: 28, marginLeft: 8 },
  row: { flexDirection: "row-reverse", justifyContent: "space-between", borderBottom: "1 solid #e4e9ef", paddingVertical: 4 },
  small: { fontSize: 8, color: "#657084", textAlign: "right" },
  sourceLatin: { fontSize: 9, color: "#657084", direction: "ltr", textAlign: "right", marginBottom: 6 },
  footer: { position: "absolute", bottom: 22, left: 42, right: 42, textAlign: "center", color: "#7b8494", fontSize: 8, direction: "rtl" },
});

const fa = (n: number | null, digits = 1) => n == null ? "محاسبه نشد" : n.toLocaleString("fa-IR", { maximumFractionDigits: digits });
const group = (value: ResultSnapshot["examGroup"]) => value === "experimental" ? "تجربی" : "ریاضی";
const rtlSentence = (value: string) => `\u200f${value.replace(/(?<!\d)\.(?!\d)/g, "۔")}\u200f`;

function PercentRing({ value }: { value: number | null }) {
  if (value == null) return null;
  const percent = Math.max(0, Math.min(100, value));
  const radius = 14;
  const circumference = 2 * Math.PI * radius;
  return <Svg style={styles.ring} viewBox="0 0 36 36">
    <Circle cx="18" cy="18" r={radius} fill="none" stroke="#dce7e3" strokeWidth="4" />
    <Circle cx="18" cy="18" r={radius} fill="none" stroke="#d16a3a" strokeWidth="4" strokeLinecap="round" strokeDasharray={`${(percent / 100) * circumference} ${circumference}`} transform="rotate(-90 18 18)" />
  </Svg>;
}

function Metric({ value, rank }: { value: number | null; rank?: number | null }) {
  if (value === null) return <Text style={styles.scorePiece}>محاسبه نشد</Text>;
  return <View style={styles.metricWrap}>
    <View style={styles.metricLine}>
    {rank != null && <><Text style={styles.scorePiece}>رتبه</Text><Text style={styles.scorePiece}>{fa(rank, 0)}</Text><Text style={styles.scorePiece}>-</Text></>}
    <Text style={styles.scorePiece}>{fa(Math.round(value), 0)}</Text>
    <Text style={styles.scorePiece}>از</Text>
    <Text style={styles.scorePiece}>۱۰۰</Text>
    </View><PercentRing value={value}/>
  </View>;
}

function RankingCard({ item, index }: { item: Ranking; index: number }) {
  return <View style={styles.card} wrap={false}>
    <View style={styles.cardTitleRow}><Text style={styles.cardIndex}>{`\u200f${fa(index + 1, 0)}.\u200f`}</Text><Text style={styles.cardTitle}>{item.title}</Text></View>
    <Metric value={item.score} rank={item.rank}/>
    {item.mappingRationale && <Text style={styles.small}>{rtlSentence(item.mappingRationale)}</Text>}
  </View>;
}

export function AssessmentReport({ result, displayName }: { result: ResultSnapshot; displayName: string }) {
  const interests = Object.values(result.profile).filter((item) => item.section === "riasec");
  return <Document title={`گزارش انتخاب‌یار - ${displayName}`} author="انتخاب‌یار">
    <Page size="A4" style={[styles.page, styles.firstPage]} wrap>
      <View style={styles.header}>
        <Text style={styles.brand}>انتخاب‌یار</Text>
        <Text style={styles.meta}>گزارش اکتشافی شناخت مسیر تحصیلی · {group(result.examGroup)} · {displayName}</Text>
      </View>
      <Text style={styles.title}>{result.explanations.title}</Text>
      <Text style={styles.shortParagraph}>{rtlSentence(result.explanations.interpretation)}</Text>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>خلاصه نتیجه</Text>
        {interests.map((item) => <View key={item.label} style={styles.row}><Text>{item.label}</Text><View style={styles.metricWrap}><View style={styles.metricLine}><Text style={styles.metricPiece}>{fa(item.score)}</Text><Text style={styles.metricPiece}>از</Text><Text style={styles.metricPiece}>۱۰۰</Text></View><PercentRing value={item.score}/></View></View>)}
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>سه خانواده پیشنهادی برای بررسی</Text>
        {result.topFamilies.length ? result.topFamilies.map((item, index) => <RankingCard key={item.id} item={item} index={index}/>) : <Text style={styles.shortParagraph}>{rtlSentence("رغبت‌ها از هم متمایز نیستند؛ پیشنهاد رتبه‌دار ارائه نشده است.")}</Text>}
      </View>
      <Text style={styles.footer} fixed>گزارش انتخاب‌یار · نتیجهٔ اکتشافی</Text>
    </Page>
    <Page size="A4" style={styles.page} wrap>
      {!result.status.includes("insufficient") && <View style={styles.section}>
        <Text style={styles.sectionTitle}>پنج رشته و مسیر پیشنهادی</Text>
        {result.topMajors.map((item, index) => <RankingCard key={item.id} item={item} index={index}/>)}
      </View>}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>محدودیت و میزان اتکا</Text>
        {result.explanations.notices.map((notice) => <View key={notice} style={styles.noticeRow}><Text style={styles.noticeBullet}>•</Text><Text style={styles.notice}>{rtlSentence(notice)}</Text></View>)}
        <Text style={styles.rightParagraph}>{rtlSentence("این گزارش تشخیص استعداد، پیش‌بینی قبولی یا توصیه قطعی نیست. نمره‌ها خودگزارشی‌اند و برای گفت‌وگو با مشاور و بررسی تجربه‌های واقعی استفاده می‌شوند.")}</Text>
      </View>
      <Text style={styles.footer} fixed>گزارش انتخاب‌یار · نتیجهٔ اکتشافی</Text>
    </Page>
    <Page size="A4" style={styles.page} wrap>
      <Text style={styles.title}>روش محاسبه و تحلیل پایداری</Text>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>روش امتیازدهی</Text>
        <Text style={styles.rightParagraph}>پاسخ‌های مثبت با فرمول (پاسخ - ۱) × ۲۵ و پاسخ‌های معکوس با (۵ - پاسخ) × ۲۵ به دامنه صفر تا صد تبدیل شدند. در همبستگی پروفایل فرد و پروفایل هدف، رغبت‌های شغلی ۷۰٪، شخصیت ۱۸٪ و ارزش‌ها ۱۲٪ وزن دارند؛ درون هر بخش وزن محورها برابر است.</Text>
        <Text style={styles.rightParagraph}>پروفایل‌های هدف شخصیت و ارزش‌ها در این نسخه الگوهای تحریریه‌ایِ آزمایشی‌اند و هنوز اعتبارسنجی روان‌سنجی نشده‌اند. توانایی خودگزارشی و سبک کار برای تفسیر مشاور نمایش داده می‌شوند و در رتبه‌بندی وزن ندارند.</Text>
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>پایداری در برابر تغییر</Text>
        <Text style={styles.rightParagraph}>{rtlSentence(result.sensitivity.interpretation)}</Text>
        <View style={styles.row}><Text>تعداد حالت‌های پاسخ</Text><Text>{fa(result.sensitivity.answerScenarioCount, 0)}</Text></View>
        <View style={styles.row}><Text>تعداد حالت‌های وزن</Text><Text>{fa(result.sensitivity.weightScenarioCount, 0)}</Text></View>
        <View style={styles.row}><Text>حالت‌های بدون رتبه‌بندی</Text><Text>{fa(result.sensitivity.unrankableScenarios, 0)}</Text></View>
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>منابع و وضعیت شواهد</Text>
        <Text style={styles.rightParagraph}>{rtlSentence("پروفایل‌های شغلی از پایگاه دادهٔ مشاغل اُونت با مجوز کریتیو کامنز انتساب گرفته شده‌اند. نگاشت شغل به رشته در این محصول تحریریه‌ای است و پذیرش رشته باید با دفترچه رسمی همان سال بررسی شود.")}</Text>
        <Text style={styles.sourceLatin}>O*NET® 31.0 · CC BY 4.0</Text>
        <Text style={styles.rightParagraph}>{rtlSentence("پرسش‌نامه فارسی و این نگاشت هنوز روی دانش‌آموزان ایرانی اعتبارسنجی روان‌سنجی نشده‌اند. نتیجه برای تصمیم‌گیری مستقل کافی نیست.")}</Text>
      </View>
      <Text style={styles.footer} fixed>انتخاب‌یار · گزارش تولیدشده در زمان نمایش نتیجه</Text>
    </Page>
  </Document>;
}

