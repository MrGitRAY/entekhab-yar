import fs from "node:fs";
import path from "node:path";
import { Document, Font, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { DimensionScore, Ranking, ResultSnapshot } from "@/domain/matching/types";

const publicRoot = path.join(process.cwd(), "public");
const fontRoot = path.join(publicRoot, "fonts");
const logoPath = path.join(publicRoot, "logo-rahyar.png");
if (!fs.existsSync(path.join(fontRoot, "Vazirmatn-FD-Regular.ttf")) || !fs.existsSync(path.join(fontRoot, "Vazirmatn-FD-Bold.ttf"))) console.error(`PDF font files are missing from ${fontRoot}`);
Font.register({ family: "Vazirmatn", fonts: [{ src: path.join(fontRoot, "Vazirmatn-FD-Regular.ttf"), fontWeight: 400 }, { src: path.join(fontRoot, "Vazirmatn-FD-Bold.ttf"), fontWeight: 700 }] });

const styles = StyleSheet.create({
  page: { padding: 38, fontFamily: "Vazirmatn", fontSize: 9.5, color: "#26301c", direction: "rtl", textAlign: "right", lineHeight: 1.55, backgroundColor: "#fbfcf7" },
  header: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", paddingBottom: 12, borderBottom: "1.5 solid #687c2b", marginBottom: 14 },
  logo: { width: 52, height: 52, objectFit: "contain", marginLeft: 12 },
  brandBlock: { flexGrow: 1, textAlign: "right" },
  brand: { fontSize: 21, fontWeight: 700, color: "#526522", textAlign: "right" },
  center: { fontSize: 9, color: "#68745a", textAlign: "right" },
  reportName: { fontSize: 11, fontWeight: 700, color: "#26301c", textAlign: "left" },
  student: { fontSize: 10, color: "#68745a", textAlign: "left" },
  card: { marginBottom: 11, padding: 12, borderRadius: 10, border: "1 solid #dfe6c9", backgroundColor: "#f5f7ed" },
  cardTitle: { marginBottom: 8, fontSize: 12, fontWeight: 700, color: "#526522", textAlign: "right" },
  lead: { marginBottom: 11, padding: 11, borderRadius: 8, backgroundColor: "#e9efcf", color: "#465527", textAlign: "right", lineHeight: 1.8 },
  interestGrid: { flexDirection: "row-reverse", flexWrap: "wrap" },
  interestItem: { width: "32.4%", marginLeft: "1.2%", marginBottom: 6, padding: 7, borderRadius: 7, backgroundColor: "#ffffff", border: "1 solid #e3e8d6" },
  itemTop: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  itemLabel: { fontSize: 9, fontWeight: 700, color: "#354321" },
  itemScore: { fontSize: 9, fontWeight: 700, color: "#697d2b" },
  bar: { height: 5, borderRadius: 4, backgroundColor: "#e3e8d6", overflow: "hidden" },
  barFill: { height: 5, borderRadius: 4, backgroundColor: "#71852f" },
  tiny: { marginTop: 3, fontSize: 7.5, color: "#7b846f", textAlign: "right" },
  category: { marginBottom: 8, paddingBottom: 6, borderBottom: "1 solid #e3e8d6" },
  categoryTitle: { marginBottom: 4, fontSize: 9.5, fontWeight: 700, color: "#526522" },
  axisRow: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", paddingVertical: 3 },
  axisLabel: { flexGrow: 1, textAlign: "right" },
  axisValue: { width: 72, fontWeight: 700, color: "#61742a", textAlign: "left" },
  familyCard: { marginBottom: 8, padding: 9, borderRadius: 8, backgroundColor: "#ffffff", border: "1 solid #dfe6c9" },
  familyHeader: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", marginBottom: 5 },
  familyTitle: { fontSize: 10.5, fontWeight: 700, color: "#26301c" },
  familyScore: { fontSize: 10, fontWeight: 700, color: "#697d2b" },
  familyDescription: { marginBottom: 4, fontSize: 8, color: "#69745f", textAlign: "right" },
  majorRow: { flexDirection: "row-reverse", justifyContent: "space-between", paddingVertical: 2, borderTop: "1 solid #eef1e5" },
  majorName: { flexGrow: 1, textAlign: "right" },
  majorScore: { width: 74, fontSize: 8.5, fontWeight: 700, color: "#697d2b", textAlign: "left" },
  notes: { minHeight: 150, backgroundColor: "#ffffff", border: "1 solid #bdc99b", borderRadius: 9 },
  notesLine: { borderBottom: "1 solid #e5e9d9", height: 27, marginHorizontal: 12 },
  footer: { position: "absolute", bottom: 20, left: 38, right: 38, textAlign: "center", color: "#879078", fontSize: 7.5 },
});

const fa = (n: number | null, digits = 0) => n == null ? "محاسبه نشد" : n.toLocaleString("fa-IR", { maximumFractionDigits: digits });
const group = (value: ResultSnapshot["examGroup"]) => value === "experimental" ? "تجربی" : "ریاضی";
const score = (n: number | null) => n == null ? "محاسبه نشد" : `${fa(Math.round(n))} از ۱۰۰`;
const rtlSentence = (value: string) => `\u200f${value.replace(/(?<!\d)\.(?!\d)/g, "۔")}\u200f`;

function InterestMap({ items }: { items: DimensionScore[] }) {
  return <View style={styles.interestGrid}>{items.map((item) => <View style={styles.interestItem} key={item.label}>
    <View style={styles.itemTop}><Text style={styles.itemLabel}>{item.label}</Text><Text style={styles.itemScore}>{fa(item.score)}</Text></View>
    <View style={styles.bar}><View style={[styles.barFill, { width: `${Math.max(0, Math.min(100, item.score))}%` }]} /></View>
    <Text style={styles.tiny}>{fa(item.itemCount)} سؤال · دامنه ۰ تا ۱۰۰</Text>
  </View>)}</View>;
}

function AxisGroups({ profile }: { profile: Record<string, DimensionScore> }) {
  const groups: [string, string][] = [["رغبت‌ها", "riasec"], ["ویژگی‌های فردی خودگزارشی", "personality"], ["ارزش‌ها", "values"], ["توانایی‌های خودگزارشی", "abilities"], ["سبک کار", "workstyle"]];
  return <View>{groups.map(([title, section]) => { const items = Object.values(profile).filter((item) => item.section === section); if (!items.length) return null; return <View style={styles.category} key={section} wrap={false}><Text style={styles.categoryTitle}>{title}</Text>{items.map((item) => <View style={styles.axisRow} key={item.label}><Text style={styles.axisLabel}>{item.label}</Text><Text style={styles.axisValue}>{fa(item.score)} از ۱۰۰</Text></View>)}</View>; })}</View>;
}

function FamilyCard({ family, majors }: { family: Ranking; majors: Ranking[] }) {
  return <View style={styles.familyCard} wrap={false}><View style={styles.familyHeader}><Text style={styles.familyTitle}>رتبه {fa(family.rank)} · {family.title}</Text><Text style={styles.familyScore}>{score(family.score)}</Text></View>
    {family.description && <Text style={styles.familyDescription}>{rtlSentence(family.description)}</Text>}
    {majors.slice(0, 5).map((major) => <View style={styles.majorRow} key={major.id}><Text style={styles.majorName}>{major.title}</Text><Text style={styles.majorScore}>{score(major.score)}</Text></View>)}
  </View>;
}

function highlightSentence(result: ResultSnapshot) {
  const interests = Object.values(result.profile).filter((x) => x.section === "riasec").sort((a, b) => b.score - a.score).slice(0, 2).map((x) => x.label);
  const traits = Object.values(result.profile).filter((x) => x.section === "personality").sort((a, b) => b.score - a.score).slice(0, 2).map((x) => x.label);
  return `در این آزمون، رغبت‌های برجسته‌تر ${interests.join(" و ")} و ویژگی‌های خودگزارشی برجسته‌تر ${traits.join(" و ")} دیده شد. این خلاصه برای شروع گفت‌وگو و بررسی مسیرهاست.`;
}

export function AssessmentReport({ result, displayName }: { result: ResultSnapshot; displayName: string }) {
  const interests = Object.values(result.profile).filter((item) => item.section === "riasec");
  return <Document title={`گزارش انتخاب‌یار - ${displayName}`} author="انتخاب‌یار">
    <Page size="A4" style={styles.page} wrap>
      <View style={styles.header}><Image style={styles.logo} src={logoPath} /><View style={styles.brandBlock}><Text style={styles.brand}>انتخاب‌یار</Text><Text style={styles.center}>مرکز مشاوره تحصیلی رهیار</Text></View><View><Text style={styles.reportName}>گزارش شناخت مسیر تحصیلی</Text><Text style={styles.student}>دانش‌آموز: {displayName} · گروه {group(result.examGroup)}</Text></View></View>
      <Text style={styles.lead}>{rtlSentence(highlightSentence(result))}</Text>
      <View style={styles.card}><Text style={styles.cardTitle}>نقشهٔ رغبت‌های تو</Text><InterestMap items={interests}/></View>
      <View style={styles.card}><Text style={styles.cardTitle}>همهٔ محورهای خودگزارشی بر اساس کاربرد</Text><AxisGroups profile={result.profile}/></View>
      <Text style={styles.footer} fixed>گزارش انتخاب‌یار · صفحه ۱</Text>
    </Page>
    <Page size="A4" style={styles.page} wrap>
      <View style={styles.card}><Text style={styles.cardTitle}>خانواده‌های برتر و رشته‌های آن‌ها</Text>{result.topFamilies.length ? result.topFamilies.map((family) => <FamilyCard key={family.id} family={family} majors={result.majorRanking.filter((major) => major.familyId === family.id)}/>) : <Text>{rtlSentence("رغبت‌ها از هم متمایز نیستند؛ پیشنهاد رتبه‌دار ارائه نشده است.")}</Text>}</View>
      <View style={styles.card}><Text style={styles.cardTitle}>یادداشت‌های مشاور یا دانش‌آموز</Text><View style={styles.notes}>{[1, 2, 3, 4, 5].map((line) => <View key={line} style={styles.notesLine}/>)}</View></View>
      <Text style={styles.footer} fixed>گزارش انتخاب‌یار · نتیجهٔ اکتشافی · صفحه ۲</Text>
    </Page>
  </Document>;
}
