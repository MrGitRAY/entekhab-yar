import { createHash } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { loadCatalog, validateCatalog } from './validate.mjs';
import { canonicalJson } from '../../src/domain/matching/canonical.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const catalog = await loadCatalog();
const { version, questions } = validateCatalog(catalog);
const payload = canonicalJson(catalog);
const hash = createHash('sha256').update(payload, 'utf8').digest('hex');
const quote = (value) => `'${String(value).replaceAll("'", "''")}'`;
const questionRows = catalog.questions.items.map((item, index) =>
  `      (${quote(version)}, ${quote(item.id)}, ${index + 1}, ${quote(item.text)}, ${quote(item.section)}, ${quote(item.primaryDimension)}, array[${item.groups.map(quote).join(', ')}]::text[])`
).join(',\n');
const sql = `-- Generated from the five JSON files by: node scripts/catalog/build-seed.mjs
-- Catalog ${version}; canonical JSON SHA-256 ${hash}
-- Apply after the migration. Reapplying the same release is safe.
do $seed$
declare v_existing_hash text;
begin
  select sha256 into v_existing_hash from public.catalog_releases where version = ${quote(version)};
  if v_existing_hash is null then
    insert into public.catalog_releases (version, sha256, payload, status)
    values (${quote(version)}, ${quote(hash)}, ${quote(payload)}::jsonb, ${quote(catalog.questions.status)});
    insert into public.catalog_questions
      (catalog_version, id, position, question_text, section, primary_dimension, groups)
    values
${questionRows};
    update public.catalog_releases set sealed_at = now() where version = ${quote(version)};
  elsif v_existing_hash <> ${quote(hash)} then
    raise exception 'catalog version already exists with different content';
  end if;

  if not exists (select 1 from public.catalog_releases
    where version = ${quote(version)} and sha256 = ${quote(hash)} and sealed_at is not null)
    or (select count(*) from public.catalog_questions where catalog_version = ${quote(version)}) <> ${questions} then
    raise exception 'catalog release is incomplete';
  end if;
  insert into public.active_catalog (singleton, catalog_version)
    values (true, ${quote(version)})
    on conflict (singleton) do update
      set catalog_version = excluded.catalog_version, updated_at = now();
end;
$seed$;
`;
await writeFile(path.join(root, 'supabase', 'seed.sql'), sql, 'utf8');
console.log(`Wrote supabase/seed.sql for ${version} (${questions} question records; SHA-256 ${hash})`);
