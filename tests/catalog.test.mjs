import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCatalog, validateCatalog } from '../scripts/catalog/validate.mjs';

const source = await loadCatalog();

test('pilot catalog is complete for both exam groups', () => {
  assert.deepEqual(validateCatalog(source).perGroup, { experimental: 60, mathematics: 60 });
});

test('rejects a question leaked into the wrong group', () => {
  const catalog = structuredClone(source);
  catalog.questions.items.find((item) => item.groups.length === 1).groups.push('mathematics');
  assert.throws(() => validateCatalog(catalog), /expected 60 questions/);
});

test('rejects a major whose family belongs to another group', () => {
  const catalog = structuredClone(source);
  catalog.majors.items.find((item) => item.id === 'medicine').familyId = 'math-tech';
  assert.throws(() => validateCatalog(catalog), /invalid major medicine/);
});

test('rejects a missing profile axis instead of treating it as zero', () => {
  const catalog = structuredClone(source);
  delete catalog.majors.items[0].interestProfile.social;
  assert.throws(() => validateCatalog(catalog), /dimension profile incomplete/);
});

test('rejects scoring weights that do not sum to one', () => {
  const catalog = structuredClone(source);
  catalog.scoring.sectionWeights.riasec = 0.4;
  assert.throws(() => validateCatalog(catalog), /sum to one/);
});

test('rejects answer effects outside the defined scale', () => {
  const catalog = structuredClone(source);
  catalog.questions.items[0].effects[0].weight = -1;
  assert.throws(() => validateCatalog(catalog), /invalid effect/);
});
