import { mkdir, writeFile } from 'node:fs/promises';
import { loadCatalog } from '../catalog/validate.mjs';
import { evaluate } from '../../src/domain/matching/engine.ts';
const c = await loadCatalog();
const cases = [
  { id: 'experimental', name: 'دانش‌آموز ساختگی تجربی', group: 'experimental', preferences: { realistic: 3, investigative: 5, artistic: 2, social: 5, enterprising: 2, conventional: 3 } },
  { id: 'mathematics', name: 'دانش‌آموز ساختگی ریاضی', group: 'mathematics', preferences: { realistic: 5, investigative: 4, artistic: 4, social: 2, enterprising: 2, conventional: 3 } },
  { id: 'undifferentiated', name: 'پاسخ ساختگی یکنواخت', group: 'mathematics', preferences: {} },
];
await mkdir(new URL('../../docs/examples/', import.meta.url), { recursive: true });
for (const example of cases) {
  const answers = Object.fromEntries(c.questions.items.filter(q => q.groups.includes(example.group)).map(q => [q.id, example.preferences[q.primaryDimension] ?? 3]));
  const result = evaluate(c, example.group, answers);
  await writeFile(new URL(`../../docs/examples/${example.id}.json`, import.meta.url), `${JSON.stringify({ synthetic: true, displayName: example.name, answers, result }, null, 2)}\n`, 'utf8');
  console.log(example.id, result.status, result.topMajors.map(m => `${m.id}: ${m.score.toFixed(1)}`).join(', '));
}
