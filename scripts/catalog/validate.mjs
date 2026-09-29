import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
export { validateCatalog } from '../../src/domain/matching/catalog-validator.mjs';
import { validateCatalog } from '../../src/domain/matching/catalog-validator.mjs';
export async function loadCatalog() {
  const names = ['questions', 'families', 'majors', 'scoring', 'report_templates'];
  return Object.fromEntries(await Promise.all(names.map(async n => [n,
    JSON.parse(await readFile(new URL(`../../data/${n}.json`, import.meta.url), 'utf8'))])));
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { console.log(JSON.stringify(validateCatalog(await loadCatalog()), null, 2)); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
