import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { loadCatalog, validateCatalog } from '../scripts/catalog/validate.mjs';
import { evaluate, profileCorrelation, scoreResponses } from '../src/domain/matching/engine.ts';
import { canonicalJson } from '../src/domain/matching/canonical.mjs';

const c = await loadCatalog();
const answersFor = (group, values = {}) => Object.fromEntries(c.questions.items.filter(q => q.groups.includes(group)).map(q => [q.id, values[q.primaryDimension] ?? 3]));
const answers = answersFor('experimental', { realistic: 3, investigative: 5, artistic: 2, social: 5, enterprising: 2, conventional: 3 });
const near = (a, b, tolerance = 1e-9) => assert.ok(Math.abs(a - b) < tolerance, `${a} != ${b}`);

test('source file checksum, selected raw ratings, dates and titles match the official pinned download', async () => {
  const bytes = await readFile(new URL('../data/sources/onet-31.0/career_interest_types.json', import.meta.url));
  assert.equal(createHash('sha256').update(bytes).digest('hex'), c.majors.profileSource.sha256);
  const rows = JSON.parse(bytes).row;
  for (const m of c.majors.items) for (const o of m.occupations) {
    const raw = rows.filter(r => r.onetsoc_code === o.code && r.scale_id === 'OI');
    assert.equal(raw.length, 6); assert.equal(o.title, raw[0].title); assert.equal(o.dateUpdated, raw[0].date_updated); assert.equal(o.domainSource, raw[0].domain_source);
    assert.deepEqual(o.rawInterests, Object.fromEntries(raw.map(r => [r.element_name.toLowerCase(), r.data_value])));
  }
});
test('catalog refuses invented target ratings, cross-section effects and publication claims', () => {
  const altered = structuredClone(c); altered.majors.items[0].interestProfile.social += 1;
  assert.throws(() => validateCatalog(altered), /differs from source/);
  const leak = structuredClone(c); leak.questions.items.find(q => q.section === 'personality').effects.push({ dimension: 'social', weight: 1, direction: 'positive' });
  assert.throws(() => validateCatalog(leak), /cross-section effect/);
  const published = structuredClone(c); published.questions.status = 'published';
  assert.throws(() => validateCatalog(published), /only pilot/);
});
test('positive, reverse and minimum/maximum scores use actual item weights', () => {
  const a = answersFor('experimental');
  a['Q-P-01'] = 5; a['Q-P-02'] = 1;
  assert.equal(scoreResponses(c, 'experimental', a).openness.score, 100);
  a['Q-P-01'] = 1; a['Q-P-02'] = 5;
  assert.equal(scoreResponses(c, 'experimental', a).openness.score, 0);
  a['Q-P-01'] = 5; a['Q-P-02'] = 5;
  const weighted = structuredClone(c); weighted.questions.items.find(q => q.id === 'Q-P-02').effects[0].weight = 0.25;
  assert.equal(scoreResponses(weighted, 'experimental', a).openness.score, 80);
  const p = scoreResponses(c, 'experimental', a);
  assert.equal(p.realistic.itemCount, 3); assert.equal(p.openness.itemCount, 2);
});
test('rejects missing, foreign, out of range, fractional and nonnumeric answers', () => {
  const missing = { ...answers }; delete missing['Q-R-01'];
  assert.throws(() => evaluate(c, 'experimental', missing), /Missing/);
  assert.throws(() => evaluate(c, 'experimental', { ...answers, 'Q-MAT-01': 3 }), /foreign/);
  for (const value of [0, 6, 1.5, '3', null, NaN, Infinity]) assert.throws(() => evaluate(c, 'experimental', { ...answers, 'Q-R-01': value }), /Invalid answer/);
  assert.throws(() => evaluate(c, 'humanities', answers), /Invalid exam group/);
});
test('Pearson has known end points, orthogonality, shift/scale invariance and no flat fallback', () => {
  near(profileCorrelation([1,2,3], [2,4,6]).correlation, 1);
  near(profileCorrelation([1,2,3], [6,4,2]).correlation, -1);
  near(profileCorrelation([-1,0,1], [1,-2,1]).correlation, 0);
  const r = profileCorrelation([1,3,2,5], [5,2,4,1]).correlation;
  near(profileCorrelation([12,16,14,20], [5,2,4,1]).correlation, r);
  assert.equal(profileCorrelation([3,3,3], [1,2,3]).correlation, null);
  assert.throws(() => profileCorrelation([1,2], [1,2], [0,1]), /Invalid/);
});
test('same inputs reproduce full snapshot, scores are finite and actual contributions sum to r', () => {
  const r = evaluate(c, 'experimental', answers);
  assert.deepEqual(evaluate(c, 'experimental', answers), r);
  for (const candidate of [...r.familyRanking, ...r.majorRanking]) {
    assert.ok(candidate.score >= 0 && candidate.score <= 100);
    near(candidate.contributions.reduce((s,x) => s + x.contribution, 0), candidate.correlation);
    near(candidate.score, 50 * (candidate.correlation + 1));
  }
  const mutable = structuredClone(c);
  const detached = evaluate(mutable, 'experimental', answers);
  const originalTitle = detached.majorRanking.find(m => m.id === 'medicine').occupations[0].title;
  mutable.majors.items[0].occupations[0].title = 'changed after evaluation';
  assert.equal(detached.majorRanking.find(m => m.id === 'medicine').occupations[0].title, originalTitle);
});
test('both groups are isolated; five recommendations belong to the top three families', () => {
  for (const group of ['experimental', 'mathematics']) {
    const r = evaluate(c, group, answersFor(group, { investigative: 5, social: 4, artistic: 2 }));
    assert.equal(r.familyRanking.length, 5); assert.equal(r.majorRanking.length, group === 'experimental' ? 21 : 22);
    assert.equal(r.topFamilies.length, 3); assert.equal(r.topMajors.length, 5);
    assert.ok(r.topMajors.every(m => r.topFamilies.some(f => f.id === m.familyId)));
    assert.ok(r.majorRanking.every(m => c.majors.items.find(x => x.id === m.id).groups.includes(group)));
  }
});
test('personality, values, perceived abilities and workstyle never leak into the ranking', () => {
  const a = { ...answers }, b = { ...answers };
  for (const q of c.questions.items.filter(q => q.groups.includes('experimental') && q.section !== 'riasec')) { a[q.id] = 1; b[q.id] = 5; }
  assert.deepEqual(evaluate(c, 'experimental', a).majorRanking, evaluate(c, 'experimental', b).majorRanking);
  assert.deepEqual(evaluate(c, 'experimental', a).familyRanking, evaluate(c, 'experimental', b).familyRanking);
});
test('flat profile withholds ranking and all scores instead of inventing recommendations', () => {
  const r = evaluate(c, 'experimental', answersFor('experimental'));
  assert.equal(r.status, 'insufficient_interest_differentiation');
  assert.deepEqual(r.topMajors, []); assert.deepEqual(r.topFamilies, []);
  assert.ok(r.majorRanking.every(x => x.score === null && x.rank === null));
  assert.equal(r.sensitivity.scenarioCount, 0);
});
test('sensitivity includes unrankable perturbations and distinguishes scenario counts from confidence', () => {
  const a = answersFor('experimental'); a['Q-R-01'] = 4;
  const r = evaluate(c, 'experimental', a);
  assert.equal(r.sensitivity.weightScenarioCount, 12);
  assert.equal(r.sensitivity.answerScenarioCount, 36);
  assert.ok(r.sensitivity.unrankableScenarios >= 1);
  for (const s of r.sensitivity.majorRanges) assert.ok(s.minRank <= s.maxRank && s.selectedCount <= r.sensitivity.scenarioCount);
});
test('candidate array ordering does not affect ranking or deterministic ties', () => {
  const shuffled = structuredClone(c); shuffled.majors.items.reverse(); shuffled.families.items.reverse();
  assert.deepEqual(evaluate(shuffled, 'experimental', answers), evaluate(c, 'experimental', answers));
  const r = evaluate(c, 'experimental', answersFor('experimental', { investigative: 5 }));
  for (let i = 1; i < r.majorRanking.length; i++) {
    const a = r.majorRanking[i-1], b = r.majorRanking[i];
    if (a.score === b.score) { assert.equal(a.rank, b.rank); assert.ok(a.id < b.id); }
  }
});
test('canonical digests survive JSONB key ordering and distinguish answer edits', () => {
  assert.equal(canonicalJson({ b: { d: 4, c: 3 }, a: 1 }), canonicalJson({ a: 1, b: { c: 3, d: 4 } }));
  assert.notEqual(canonicalJson(answers), canonicalJson({ ...answers, 'Q-R-01': 1 }));
});

test('indistinguishable candidates receive tied ranks and disclose both shortlist boundaries', () => {
  const identical = structuredClone(c);
  const template = identical.majors.items[0];
  for (const m of identical.majors.items) { m.occupations = structuredClone(template.occupations); m.interestProfile = { ...template.interestProfile }; }
  for (const f of identical.families.items) { f.occupationCodes = template.occupations.map(o => o.code).sort(); f.interestProfile = { ...template.interestProfile }; }
  const r = evaluate(identical, 'experimental', answers);
  assert.ok(r.majorRanking.every(m => m.rank === 1));
  assert.ok(r.familyRanking.every(f => f.rank === 1));
  assert.equal(r.quality.tiedFamilyBoundary, true); assert.equal(r.quality.tiedMajorBoundary, true);
  assert.deepEqual(r.majorRanking.map(m => m.id), [...r.majorRanking.map(m => m.id)].sort());
});
