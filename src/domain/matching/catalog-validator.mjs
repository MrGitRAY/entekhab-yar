export const interestAxes = ['realistic', 'investigative', 'artistic', 'social', 'enterprising', 'conventional'];
const sections = ['riasec', 'personality', 'values', 'abilities', 'workstyle'];
const groups = ['experimental', 'mathematics'];
const dimensionIds = [...interestAxes, 'openness', 'conscientiousness', 'extraversion', 'agreeableness', 'emotional_stability', 'income', 'security', 'freedom', 'impact', 'growth', 'lifestyle', 'analytical', 'numerical', 'verbal', 'spatial', 'creativity', 'learning', 'focus', 'persistence', 'independence'];
const object = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const text = v => typeof v === 'string' && v.trim().length > 0;
const number = (v, lo, hi) => typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi;
const require = (condition, message) => { if (!condition) throw new Error(message); };
const unique = (xs, name) => require(new Set(xs).size === xs.length, `duplicate ${name}`);
const sameKeys = (v, keys) => object(v) && Object.keys(v).sort().join() === [...keys].sort().join();
export function validateCatalog(c) {
  require(object(c), 'invalid catalog');
  const files = ['questions', 'families', 'majors', 'scoring', 'report_templates'];
  const version = c.questions?.catalogVersion;
  require(text(version), 'catalog version missing');
  for (const n of files) {
    require(c[n]?.schemaVersion === 2 && c[n]?.catalogVersion === version, 'unsupported schema or catalog versions must match');
    require(c[n].status === 'pilot', 'only pilot release supported until validation gates are satisfied');
  }
  const { questions: q, scoring: s, families: f, majors: m, report_templates: t } = c;
  require(s.method === 'riasec_profile_correlation_v1' && s.engineVersion === '0.2.0', 'unsupported matching method');
  require(s.releaseGate?.status === 'pilot_only' && s.releaseGate.questionnaireValidation === 'pending' && s.releaseGate.crosswalkExpertReview === 'pending' && s.releaseGate.iranAdmissionVerification === 'pending', 'invalid evidence gate');
  require(sameKeys(s.sectionWeights, sections) && sections.every(x => number(s.sectionWeights[x], 0, 1)) && Math.abs(sections.reduce((n, x) => n + s.sectionWeights[x], 0) - 1) < 1e-10, 'section weights must sum to one');
  require(s.sectionWeights.riasec === 1, 'unvalidated composite weights are disabled');
  require(sameKeys(s.dimensionWeights, interestAxes) && interestAxes.every(a => s.dimensionWeights[a] === 1), 'baseline interest weights must be equal');
  require(s.sensitivity?.answerStep === 1 && s.sensitivity.dimensionWeightRelativeChange === 0.2, 'unsupported sensitivity settings');
  require(s.scale?.min === 1 && s.scale.max === 5 && s.scale.labels?.length === 5 && s.scale.labels.every(text), 'invalid Likert scale');
  require(s.missingAnswerPolicy === 'reject_submission' && s.ranking?.familyCount === 3 && s.ranking.recommendationCount === 5 && s.ranking.tieBreaker === 'id_ascending', 'invalid ranking settings');
  require(Array.isArray(s.dimensions) && s.dimensions.length === 26, 'expected 26 dimensions');
  const ids = s.dimensions.map(d => d.id); unique(ids, 'dimensions');
  require(ids.join() === dimensionIds.join(), 'dimension identities must match the measurement contract');
  const dimById = new Map(s.dimensions.map(d => [d.id, d]));
  require(s.dimensions.every(d => text(d.id) && text(d.label) && sections.includes(d.section) && d.kind === 'self_report'), 'invalid dimension');
  require(s.dimensions.filter(d => d.section === 'riasec').map(d => d.id).join() === interestAxes.join(), 'invalid RIASEC dimensions');
  require(Array.isArray(q.items) && q.items.length === 64, 'expected 64 question records');
  unique(q.items.map(x => x.id), 'question IDs'); unique(q.items.map(x => x.text), 'question texts');
  for (const item of q.items) {
    require(text(item.id) && text(item.text) && item.text.length <= 220 && dimById.get(item.primaryDimension)?.section === item.section, `invalid question ${item.id}`);
    require(Array.isArray(item.groups) && item.groups.length > 0 && item.groups.every(g => groups.includes(g)), `invalid groups ${item.id}`); unique(item.groups, 'question groups');
    require(Array.isArray(item.effects) && item.effects.length > 0 && item.effects.some(e => e.dimension === item.primaryDimension), `missing effects ${item.id}`); unique(item.effects.map(e => e.dimension), 'effects');
    require(item.effects.every(e => dimById.has(e.dimension) && number(e.weight, 0.01, 1) && ['positive', 'negative'].includes(e.direction)), `invalid effect ${item.id}`);
    require(item.effects.every(e => dimById.get(e.dimension).section === item.section), `cross-section effect ${item.id}`);
    require(item.evidenceStatus === 'authored_pilot_not_validated', 'question evidence status missing');
  }
  const perGroup = {};
  for (const group of groups) {
    const selected = q.items.filter(x => x.groups.includes(group)); perGroup[group] = selected.length;
    require(selected.length === 60, `${group}: expected 60 questions`);
    for (const id of ids) require(selected.filter(x => x.primaryDimension === id).length >= 2, `missing dimension coverage ${id}`);
    for (const id of interestAxes) require(selected.filter(x => x.primaryDimension === id).length === 3, `unbalanced interest coverage ${id}`);
  }
  require(Array.isArray(f.items) && f.items.length === 10 && Array.isArray(m.items) && m.items.length === 43, 'invalid candidate counts');
  unique(f.items.map(x => x.id), 'family IDs'); unique(m.items.map(x => x.id), 'major IDs');
  unique(m.items.map(x => `${x.groups?.[0]}:${x.title}`), 'major titles within group');
  const familyById = new Map(f.items.map(x => [x.id, x])); const occupations = new Map();
  require(m.profileSource?.dataset === 'O*NET 31.0 Database' && /^[a-f0-9]{64}$/.test(m.profileSource.sha256) && m.profileSource.license === 'https://creativecommons.org/licenses/by/4.0/', 'missing source provenance');
  for (const item of m.items) {
    require(text(item.id) && text(item.title) && ['major', 'pathway'].includes(item.kind) && item.groups?.length === 1 && familyById.get(item.familyId)?.group === item.groups[0] && item.admissionStatus === 'unverified' && item.profileStatus === 'occupation_proxy_unvalidated', `invalid major ${item.id}`);
    require(item.mapping?.status === 'editorial_pending_expert_review' && text(item.mapping.rationale) && item.mapping.method === 'equal_mean_selected_occupations', 'invalid crosswalk evidence');
    require(Array.isArray(item.occupations) && item.occupations.length > 0, 'missing source occupations'); unique(item.occupations.map(o => o.code), 'occupation codes');
    for (const o of item.occupations) {
      require(/^\d{2}-\d{4}\.\d{2}$/.test(o.code) && text(o.title) && text(o.domainSource) && text(o.dateUpdated) && sameKeys(o.rawInterests, interestAxes) && interestAxes.every(a => number(o.rawInterests[a], 1, 7)), 'invalid source occupation');
      if (occupations.has(o.code)) require(JSON.stringify(occupations.get(o.code)) === JSON.stringify(o), 'inconsistent duplicate occupation');
      occupations.set(o.code, o);
    }
    checkProfile(item.interestProfile, item.occupations);
  }
  for (const item of f.items) {
    require(text(item.id) && text(item.title) && text(item.description) && groups.includes(item.group) && item.profileStatus === 'occupation_proxy_unvalidated' && item.aggregation === 'equal_mean_unique_occupations', 'invalid family');
    const codes = [...new Set(m.items.filter(x => x.familyId === item.id).flatMap(x => x.occupations.map(o => o.code)))].sort();
    require(codes.length > 0 && Array.isArray(item.occupationCodes) && item.occupationCodes.join() === codes.join(), 'invalid family source coverage');
    checkProfile(item.interestProfile, codes.map(code => occupations.get(code)));
  }
  for (const g of groups) {
    const fs = f.items.filter(x => x.group === g); require(fs.length === 5, 'expected five families per group');
    require(m.items.filter(x => x.groups.includes(g)).length === (g === 'experimental' ? 21 : 22), 'invalid group candidate count');
    require(fs.map(x => m.items.filter(v => v.familyId === x.id).length).sort((a,b) => a-b).slice(0,3).reduce((a,b) => a+b,0) >= 5, 'insufficient recommendation coverage');
  }
  for (const a of ['student', 'counselor']) require(text(t.audiences?.[a]?.title) && text(t.audiences[a].disclaimer), 'invalid report template');
  return { version, questions: q.items.length, perGroup, families: f.items.length, majors: m.items.length, dimensions: ids.length };
}
function checkProfile(p, occupations) {
  require(sameKeys(p, interestAxes), 'dimension profile incomplete');
  for (const a of interestAxes) {
    const expected = occupations.reduce((s,o) => s + (o.rawInterests[a] - 1) * 100 / 6, 0) / occupations.length;
    require(number(p[a], 0, 100) && Math.abs(p[a] - expected) < 1e-9, `profile differs from source ${a}`);
  }
  require(Math.max(...Object.values(p)) - Math.min(...Object.values(p)) > 1e-9, 'flat target profile');
}
