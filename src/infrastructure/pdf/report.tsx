import fs from "node:fs";
import path from "node:path";
import { Document, Font, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { DimensionScore, Ranking, ResultSnapshot } from "@/domain/matching/types";

const publicRoot = path.join(process.cwd(), "public");
const fontRoot = path.join(publicRoot, "fonts");
const logoPath = path.join(publicRoot, "logo-rahyar.png");
const logoData = fs.readFileSync(logoPath);
if (!fs.existsSync(path.join(fontRoot, "Vazirmatn-FD-Regular.ttf")) || !fs.existsSync(path.join(fontRoot, "Vazirmatn-FD-Bold.ttf"))) console.error(`PDF font files are missing from ${fontRoot}`);
Font.register({ family: "Vazirmatn", fonts: [{ src: path.join(fontRoot, "Vazirmatn-FD-Regular.ttf"), fontWeight: 400 }, { src: path.join(fontRoot, "Vazirmatn-FD-Bold.ttf"), fontWeight: 700 }] });

const styles = StyleSheet.create({
  page: { padding: 34, fontFamily: "Vazirmatn", fontSize: 9.5, color: "#26301c", direction: "rtl", textAlign: "right", lineHeight: 1.45, backgroundColor: "#fbfcf7" },
  header: { paddingBottom: 8, borderBottom: "1.5 solid #687c2b", marginBottom: 9, textAlign: "right" },
  headerRow: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", width: "100%" },
  identity: { flexDirection: "row-reverse", alignItems: "center", width: "48%", textAlign: "right" },
  logo: { width: 50, height: 50, objectFit: "contain", marginLeft: 8 },
  brandBlock: { textAlign: "right" },
  brand: { fontSize: 18, fontWeight: 700, color: "#526522", textAlign: "right", lineHeight: 1.35, marginBottom: 9 },
  center: { fontSize: 8.5, color: "#68745a", textAlign: "right", lineHeight: 1.5 },
  headerMeta: { width: "48%", textAlign: "left" },
  reportName: { fontSize: 10.5, fontWeight: 700, color: "#26301c", textAlign: "left", marginBottom: 4 },
  student: { fontSize: 9, color: "#68745a", textAlign: "left" },
  card: { marginBottom: 8, padding: 9, borderRadius: 10, border: "1 solid #dfe6c9", backgroundColor: "#f5f7ed" },
  cardTitle: { marginBottom: 6, fontSize: 11, fontWeight: 700, color: "#526522", textAlign: "right" },
  lead: { marginBottom: 11, padding: 10, borderRadius: 8, backgroundColor: "#e9efcf", color: "#465527", textAlign: "right", lineHeight: 1.7 },
  interestGrid: { flexDirection: "row-reverse", flexWrap: "wrap" },
  interestItem: { width: "33%", marginBottom: 3, padding: 5, borderRadius: 7, backgroundColor: "#ffffff", border: "1 solid #e3e8d6" },
  itemTop: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", marginBottom: 3 },
  itemLabel: { fontSize: 8.5, fontWeight: 700, color: "#354321" },
  itemScore: { fontSize: 8.5, fontWeight: 700, color: "#697d2b" },
  bar: { height: 4, borderRadius: 4, backgroundColor: "#e3e8d6", overflow: "hidden", flexDirection: "row-reverse" },
  barFill: { height: 4, borderRadius: 4, backgroundColor: "#71852f" },
  tiny: { marginTop: 3, fontSize: 7.5, color: "#7b846f", textAlign: "right" },
  axisGrid: { flexDirection: "row-reverse", flexWrap: "wrap", justifyContent: "space-between" },
  category: { width: "49%", marginBottom: 5, padding: 5, borderRadius: 7, backgroundColor: "#ffffff", border: "1 solid #e3e8d6" },
  categoryWide: { width: "100%" },
  categoryTitle: { marginBottom: 3, fontSize: 8.5, fontWeight: 700, color: "#526522", textAlign: "right" },
  axisEntry: { marginBottom: 2 },
  axisRow: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" },
  axisLabel: { flexGrow: 0, textAlign: "right", fontSize: 7.4 },
  axisValue: { width: 34, fontSize: 7.4, fontWeight: 700, color: "#61742a", textAlign: "left" },
  axisBar: { height: 3, marginTop: 1, borderRadius: 3, backgroundColor: "#e6eadb", overflow: "hidden", flexDirection: "row-reverse" },
  axisBarFill: { height: 3, borderRadius: 3 },
  familyGrid: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "stretch" },
  familyCard: { width: "32.5%", padding: 7, borderRadius: 8, backgroundColor: "#ffffff", border: "1 solid #dfe6c9" },
  familyHeader: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", marginBottom: 5 },
  familyTitle: { fontSize: 8.5, fontWeight: 700, color: "#26301c", textAlign: "right" },
  familyScore: { fontSize: 8.5, fontWeight: 700, color: "#697d2b", textAlign: "left" },
  familyDescription: { marginBottom: 4, fontSize: 7.2, color: "#69745f", textAlign: "right" },
  majorRow: { flexDirection: "row-reverse", justifyContent: "flex-start", alignItems: "center", paddingVertical: 2, borderTop: "1 solid #eef1e5" },
  majorName: { flexShrink: 1, textAlign: "right", fontSize: 7.5 },
  majorScore: { marginRight: 5, fontSize: 7.5, fontWeight: 700, color: "#697d2b", textAlign: "right" },
  allMajorRow: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", borderBottom: "1 solid #e6eadb", paddingVertical: 3 },
  allMajorLabelGroup: { width: "82%", flexDirection: "row-reverse", alignItems: "center" },
  rank: { width: 34, fontWeight: 700, color: "#657a2c", textAlign: "right" },
  allMajorName: { flexGrow: 1, textAlign: "right", marginRight: 8 },
  allMajorScore: { width: 52, fontWeight: 700, color: "#657a2c", textAlign: "left" },
  notes: { minHeight: 660, backgroundColor: "#ffffff", border: "1 solid #bdc99b", borderRadius: 9 },
  notesLine: { borderBottom: "1 solid #e5e9d9", height: 31, marginHorizontal: 12 },
  footer: { position: "absolute", bottom: 20, left: 38, right: 38, textAlign: "center", color: "#879078", fontSize: 7.5 },
});

const fa = (n: number | null, digits = 0) => n == null ? "محاسبه نشد" : n.toLocaleString("fa-IR", { maximumFractionDigits: digits });
const group = (value: ResultSnapshot["examGroup"]) => value === "experimental" ? "تجربی" : "ریاضی";
const percent = (n: number | null) => n == null ? "محاسبه نشد" : `${fa(Math.round(n))}٪`;
const rtlSentence = (value: string) => `\u200f${value.replace(/(?<!\d)\.(?!\d)/g, "۔")}\u200f`;

function InterestMap({ items }: { items: DimensionScore[] }) {
  return <View style={styles.interestGrid}>{items.map((item) => <View style={styles.interestItem} key={item.label}>
    <View style={styles.itemTop}><Text style={styles.itemLabel}>{item.label}</Text><Text style={styles.itemScore}>{percent(item.score)}</Text></View>
    <View style={styles.bar}><View style={[styles.barFill, { width: `${Math.max(0, Math.min(100, item.score))}%` }]} /></View>
  </View>)}</View>;
}

function AxisGroups({ profile }: { profile: Record<string, DimensionScore> }) {
  const groups: [string, string, string][] = [["رغبت‌ها", "riasec", "#71852f"], ["ویژگی‌های فردی خودگزارشی", "personality", "#7a5c9e"], ["ارزش‌ها", "values", "#c07b2c"], ["توانایی‌های خودگزارشی", "abilities", "#2f7890"], ["سبک کار", "workstyle", "#b65359"]];
  return <View style={styles.axisGrid}>{groups.map(([title, section, color]) => { const items = Object.values(profile).filter((item) => item.section === section); if (!items.length) return null; return <View style={[styles.category, section === "workstyle" ? styles.categoryWide : {}]} key={section} wrap={false}><Text style={[styles.categoryTitle, { color }]}>{title}</Text>{items.map((item) => <View style={styles.axisEntry} key={item.label}><View style={styles.axisRow}><Text style={styles.axisLabel}>{item.label}</Text><Text style={[styles.axisValue, { color }]}>{percent(item.score)}</Text></View><View style={styles.axisBar}><View style={[styles.axisBarFill, { width: `${Math.max(0, Math.min(100, item.score))}%`, backgroundColor: color }]} /></View></View>)}</View>; })}</View>;
}

function FamilyCard({ family, majors }: { family: Ranking; majors: Ranking[] }) {
  return <View style={styles.familyCard} wrap={false}><View style={styles.familyHeader}><Text style={styles.familyTitle}>رتبه {fa(family.rank)} · {family.title}</Text><Text style={styles.familyScore}>{percent(family.score)}</Text></View>
    {family.description && <Text style={styles.familyDescription}>{rtlSentence(family.description)}</Text>}
    {majors.slice(0, 5).map((major) => <View style={styles.majorRow} key={major.id}><Text style={styles.majorName}>{major.title}</Text><Text style={styles.majorScore}>{percent(major.score)}</Text></View>)}
  </View>;
}

export function AssessmentReport({ result, displayName }: { result: ResultSnapshot; displayName: string }) {
  const interests = Object.values(result.profile).filter((item) => item.section === "riasec");
  return <Document title={`گزارش انتخاب‌یار - ${displayName}`} author="انتخاب‌یار">
    <Page size="A4" style={styles.page} wrap>
      <View style={styles.header}><View style={styles.headerRow}><View style={styles.identity}><Image style={styles.logo} src={logoData} /><View style={styles.brandBlock}><Text style={styles.brand}>انتخاب‌یار</Text><Text style={styles.center}>مرکز مشاوره تحصیلی رهیار</Text></View></View><View style={styles.headerMeta}><Text style={styles.reportName}>گزارش شناخت مسیر تحصیلی</Text><Text style={styles.student}>دانش‌آموز: {displayName} · گروه {group(result.examGroup)}</Text></View></View></View>
      <View style={styles.card}><Text style={styles.cardTitle}>نقشهٔ رغبت‌های تو</Text><InterestMap items={interests}/></View>
      <View style={styles.card}><Text style={styles.cardTitle}>همهٔ محورهای خودگزارشی بر اساس کاربرد</Text><AxisGroups profile={result.profile}/></View>
      <Text style={styles.footer} fixed>گزارش انتخاب‌یار · صفحه ۱</Text>
    </Page>
    <Page size="A4" style={styles.page} wrap>
      <View style={styles.card}><Text style={styles.cardTitle}>خانواده‌های برتر و رشته‌های آن‌ها</Text>{result.topFamilies.length ? <View style={styles.familyGrid}>{result.topFamilies.slice(0, 3).map((family) => <FamilyCard key={family.id} family={family} majors={result.majorRanking.filter((major) => major.familyId === family.id)}/>)}</View> : <Text>{rtlSentence("رغبت‌ها از هم متمایز نیستند؛ پیشنهاد رتبه‌دار ارائه نشده است.")}</Text>}</View>
      <View style={styles.card}><Text style={styles.cardTitle}>رتبه‌بندی مستقل همهٔ رشته‌ها</Text>{result.majorRanking.map((major) => <View style={styles.allMajorRow} key={major.id}><View style={styles.allMajorLabelGroup}><Text style={styles.rank}>رتبه {fa(major.rank)}</Text><Text style={styles.allMajorName}>{major.title}</Text></View><Text style={styles.allMajorScore}>{percent(major.score)}</Text></View>)}</View>
      <Text style={styles.footer} fixed>گزارش انتخاب‌یار · نتیجهٔ اکتشافی · صفحه ۲</Text>
    </Page>
    <Page size="A4" style={styles.page} wrap>
      <View style={styles.card}><Text style={styles.cardTitle}>یادداشت‌های مشاور یا دانش‌آموز</Text><View style={styles.notes}>{Array.from({ length: 20 }, (_, index) => <View key={index} style={styles.notesLine}/>)}</View></View>
      <Text style={styles.footer} fixed>گزارش انتخاب‌یار · نتیجهٔ اکتشافی · صفحه ۳</Text>
    </Page>
  </Document>;
}
