import { interestAxes, validateCatalog } from "./catalog-validator.mjs";
import type { Catalog, DimensionScore, ExamGroup, Ranking, ResultSnapshot, SensitivityRange } from "./types";

export const ENGINE_VERSION = "0.2.0";
const EPSILON = 1e-12;
const compareId = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;

export function scoreResponses(catalog: Catalog, group: ExamGroup, answers: Record<string, number>): Record<string, DimensionScore> {
  if (!["experimental", "mathematics"].includes(group)) throw new Error("Invalid exam group");
  if (!answers || typeof answers !== "object" || Array.isArray(answers)) throw new Error("Invalid answers");
  const questions = catalog.questions.items.filter(q => q.groups.includes(group));
  const allowed = new Set(questions.map(q => q.id));
  if (Object.keys(answers).length !== questions.length || Object.keys(answers).some(id => !allowed.has(id))) throw new Error("Missing or foreign answers");
  const sums: Record<string, { sum: number; weight: number; count: number }> = Object.fromEntries(catalog.scoring.dimensions.map(d => [d.id, { sum: 0, weight: 0, count: 0 }]));
  for (const q of questions) {
    const answer = answers[q.id];
    if (!Number.isInteger(answer) || answer < 1 || answer > 5) throw new Error(`Invalid answer ${q.id}`);
    for (const e of q.effects) {
      const score = (e.direction === "positive" ? answer - 1 : 5 - answer) * 25;
      sums[e.dimension].sum += score * e.weight;
      sums[e.dimension].weight += e.weight;
      sums[e.dimension].count++;
    }
  }
  return Object.fromEntries(catalog.scoring.dimensions.map(d => {
    const v = sums[d.id];
    if (!v || v.weight <= 0) throw new Error(`Unmeasured dimension ${d.id}`);
    return [d.id, { score: v.sum / v.weight, itemCount: v.count, totalWeight: v.weight, label: d.label, section: d.section }];
  }));
}

// Weighted Pearson correlation; equal weights are the production baseline.
// Per-axis terms sum to r. They are contributions, not causal explanations.
export function profileCorrelation(x: number[], y: number[], weights = x.map(() => 1)) {
  if (x.length < 2 || x.length !== y.length || x.length !== weights.length || [...x, ...y, ...weights].some(v => !Number.isFinite(v)) || weights.some(w => w <= 0)) throw new Error("Invalid correlation vectors");
  const total = weights.reduce((s, w) => s + w, 0);
  const mx = x.reduce((s, v, i) => s + weights[i] * v, 0) / total;
  const my = y.reduce((s, v, i) => s + weights[i] * v, 0) / total;
  const dx = x.map(v => v - mx), dy = y.map(v => v - my);
  const denominator = Math.sqrt(dx.reduce((s, v, i) => s + weights[i] * v * v, 0) * dy.reduce((s, v, i) => s + weights[i] * v * v, 0));
  if (denominator <= EPSILON) return { correlation: null, terms: x.map(() => 0), mx, my };
  const terms = dx.map((v, i) => weights[i] * v * dy[i] / denominator);
  return { correlation: Math.max(-1, Math.min(1, terms.reduce((s, v) => s + v, 0))), terms, mx, my };
}

function rank(catalog: Catalog, group: ExamGroup, profile: Record<string, DimensionScore>, weights: Record<string, number>) {
  const x = interestAxes.map(a => profile[a].score);
  function candidate(item: { id: string; title: string; interestProfile: Record<string, number> }): Ranking {
    const y = interestAxes.map(a => item.interestProfile[a]);
    const { correlation, terms, mx, my } = profileCorrelation(x, y, interestAxes.map(a => weights[a]));
    return { id: item.id, title: item.title, rank: null, correlation, score: correlation === null ? null : 50 * (correlation + 1),
      contributions: interestAxes.map((a, i) => ({ dimension: a, label: profile[a].label, userScore: x[i], targetScore: y[i], contribution: terms[i],
        relationship: Math.abs(terms[i]) < EPSILON ? "neutral" : terms[i] < 0 ? "different" : x[i] > mx && y[i] > my ? "shared_higher" : "shared_lower" })) };
  }
  function sort(items: Ranking[]) {
    items.sort((a, b) => (b.score ?? -1) - (a.score ?? -1) || compareId(a.id, b.id));
    items.forEach((item, i) => { item.rank = item.score === null ? null : i > 0 && Math.abs(item.score - (items[i - 1].score ?? -1)) <= EPSILON ? items[i - 1].rank : i + 1; });
    return items;
  }
  const familyRanking = sort(catalog.families.items.filter(f => f.group === group).map(f => ({ ...candidate(f), description: f.description })));
  const majorRanking = sort(catalog.majors.items.filter(m => m.groups.includes(group)).map(m => ({ ...candidate(m), familyId: m.familyId, kind: m.kind, mappingRationale: m.mapping.rationale, occupations: structuredClone(m.occupations) })));
  const topFamilies = familyRanking.filter(f => f.score !== null).slice(0, 3);
  const familyIds = new Set(topFamilies.map(f => f.id));
  const eligible = majorRanking.filter(m => m.score !== null && familyIds.has(m.familyId!));
  return { familyRanking, majorRanking, topFamilies, topMajors: eligible.slice(0, 5), eligible };
}

export function evaluate(catalog: Catalog, group: ExamGroup, answers: Record<string, number>): ResultSnapshot {
  validateCatalog(catalog);
  const profile = scoreResponses(catalog, group, answers);
  const ranked = rank(catalog, group, profile, catalog.scoring.dimensionWeights);
  const { eligible, ...rankings } = ranked;
  const range = Math.max(...interestAxes.map(a => profile[a].score)) - Math.min(...interestAxes.map(a => profile[a].score));
  const flat = ranked.topFamilies.length === 0;
  const tied = (items: Ranking[], cut: number) => items.length > cut && items[cut - 1].score !== null && Math.abs(items[cut - 1].score! - items[cut].score!) <= EPSILON;
  const notices = [
    "پرسش‌نامه فارسی هنوز روی دانش‌آموزان ایرانی اعتبارسنجی نشده است؛ نتیجه برای بررسی مسیرهاست.",
    "داده‌های هدف از شغل‌های نمونه در آمریکا آمده‌اند. نگاشت آن‌ها به رشته‌های این فهرست نیازمند بازبینی متخصص است.",
    "گروه و عنوان‌های رشته‌ها فهرست اکتشافی محصول‌اند؛ مجاز بودن پذیرش باید با دفترچه رسمی همان سال بررسی شود.",
  ];
  if (flat) notices.unshift("شش رغبت امتیاز یکسان دارند؛ رتبه‌بندی معنادار نیست و پیشنهادی به عنوان برتر نمایش داده نمی‌شود.");
  else if (range < 25) notices.unshift("فاصله بین رغبت‌ها کم است؛ تغییر اندک پاسخ‌ها ممکن است ترتیب مسیرها را عوض کند. تحلیل حساسیت را ببینید.");
  const uniformResponses = new Set(Object.values(answers)).size === 1;
  if (uniformResponses) notices.push("همه گزینه‌های انتخاب‌شده یکسان‌اند؛ اگر قصدت این نبوده پاسخ‌ها را در یک آزمون تازه بازبینی کن. این الگو به‌تنهایی نشانه بی‌دقتی نیست.");
  const tiedFamilyBoundary = tied(ranked.familyRanking, 3), tiedMajorBoundary = tied(eligible, 5);
  if (tiedFamilyBoundary || tiedMajorBoundary) notices.push("در مرز فهرست کوتاه امتیاز برابر وجود دارد؛ انتخاب بر اساس شناسه صرفاً برای نمایش ثابت است. فهرست کامل را بررسی کنید.");

  const sensitivity: ResultSnapshot["sensitivity"] = { scenarioCount: 0, answerScenarioCount: 0, weightScenarioCount: 0, unrankableScenarios: 0, familyRanges: [], majorRanges: [], interpretation: "تغییر هر پاسخ رغبت به اندازه یک گزینه و تغییر وزن هر محور به اندازه ±۲۰٪، هر بار جداگانه؛ این دامنه‌ها فاصله اطمینان یا پایایی آزمون نیستند و خطای نگاشت رشته به شغل را نمی‌سنجند." };
  if (!flat) {
    const familyMap = new Map<string, SensitivityRange>(ranked.familyRanking.map(r => [r.id, { id: r.id, minRank: r.rank!, maxRank: r.rank!, selectedCount: 0 }]));
    const majorMap = new Map<string, SensitivityRange>(ranked.majorRanking.map(r => [r.id, { id: r.id, minRank: r.rank!, maxRank: r.rank!, selectedCount: 0 }]));
    function scenario(p: Record<string, DimensionScore>, w: Record<string, number>, kind: "answer" | "weight") {
      sensitivity.scenarioCount++;
      if (kind === "answer") sensitivity.answerScenarioCount++; else sensitivity.weightScenarioCount++;
      const s = rank(catalog, group, p, w);
      if (s.topFamilies.length === 0) { sensitivity.unrankableScenarios++; return; }
      for (const [list, selected, map] of [[s.familyRanking, s.topFamilies, familyMap], [s.majorRanking, s.topMajors, majorMap]] as const) {
        for (const r of list) { const v = map.get(r.id)!; v.minRank = Math.min(v.minRank, r.rank!); v.maxRank = Math.max(v.maxRank, r.rank!); if (selected.some(x => x.id === r.id)) v.selectedCount++; }
      }
    }
    for (const q of catalog.questions.items.filter(q => q.groups.includes(group) && q.section === "riasec")) {
      for (const delta of [-1, 1]) {
        const value = answers[q.id] + delta * catalog.scoring.sensitivity.answerStep;
        if (value >= 1 && value <= 5) scenario(scoreResponses(catalog, group, { ...answers, [q.id]: value }), catalog.scoring.dimensionWeights, "answer");
      }
    }
    for (const axis of interestAxes) for (const sign of [-1, 1]) scenario(profile, { ...catalog.scoring.dimensionWeights, [axis]: 1 + sign * catalog.scoring.sensitivity.dimensionWeightRelativeChange }, "weight");
    sensitivity.familyRanges = [...familyMap.values()]; sensitivity.majorRanges = [...majorMap.values()];
  }
  const highest = Math.max(...interestAxes.map(a => profile[a].score));
  const leaders = interestAxes.filter(a => Math.abs(profile[a].score - highest) < EPSILON).map(a => profile[a].label);
  return {
    schemaVersion: 2, engineVersion: ENGINE_VERSION, catalogVersion: catalog.questions.catalogVersion, examGroup: group,
    status: flat ? "insufficient_interest_differentiation" : "exploratory", profile, ...rankings,
    explanations: { title: flat ? "رغبت‌ها هنوز از هم متمایز نشده‌اند" : `رغبت برجسته در پاسخ‌های تو: ${leaders.join("، ")}`,
      interpretation: catalog.report_templates.audiences.student.disclaimer, notices },
    method: { id: catalog.scoring.method, sectionWeights: { ...catalog.scoring.sectionWeights }, dimensionWeights: { ...catalog.scoring.dimensionWeights }, scoreMeaning: catalog.scoring.scoreMeaning },
    evidence: { status: "unvalidated_pilot", source: structuredClone(catalog.majors.profileSource), questionnaire: "authored_fa_unvalidated", crosswalk: "editorial_pending_expert_review", admission: "unverified" },
    quality: { uniformResponses, interestRange: range, tiedFamilyBoundary, tiedMajorBoundary }, sensitivity,
  };
}
