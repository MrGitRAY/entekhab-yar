import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { loadCatalog } from '../scripts/catalog/validate.mjs';
import { canonicalJson } from '../src/domain/matching/canonical.mjs';
import { evaluate } from '../src/domain/matching/engine.ts';
let PGlite;
try { ({ PGlite } = await import('../.db-validation/node_modules/@electric-sql/pglite/dist/index.js')); }
catch { test('matching database integration', { skip: 'Install optional PGlite to run the database gate' }, () => {}); }
if (PGlite) test('real engine snapshots: authorization, atomic completion, retries, flat results and immutable versions', async () => {
  const db = new PGlite(); const c = await loadCatalog();
  const hash = v => createHash('sha256').update(canonicalJson(v)).digest('hex');
  const owner = '11111111-1111-4111-8111-111111111111', stranger = '22222222-2222-4222-8222-222222222222';
  const sql = async (q, args = []) => (await db.query(q, args)).rows;
  const as = async (role, id = '') => { await db.exec(`set role ${role}`); await sql('select set_config($1,$2,false)', ['request.jwt.claim.sub', id]); };
  try {
    await db.exec(`create role anon; create role authenticated; create role service_role;
      create schema auth; create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      grant usage on schema public, auth to anon, authenticated, service_role;`);
    for (const file of ['supabase/migrations/202609270001_initial_catalog_and_attempts.sql', 'supabase/migrations/202609270002_matching_snapshot.sql', 'supabase/seed.sql']) {
      try { await db.exec(await readFile(new URL(`../${file}`, import.meta.url), 'utf8')); }
      catch (e) { console.error({ file, message: e.message, position: e.position, internalPosition: e.internalPosition, where: e.where }); throw e; }
    }
    await sql('insert into auth.users values ($1), ($2)', [owner, stranger]);
    const release = (await sql('select payload,sha256 from catalog_releases where version=$1', [c.questions.catalogVersion]))[0];
    assert.equal(hash(release.payload), release.sha256, 'canonical hash must survive JSONB');
    const completed = [];
    for (const [group, flat] of [['experimental', false], ['mathematics', false], ['experimental', true]]) {
      const answers = Object.fromEntries(c.questions.items.filter(q => q.groups.includes(group)).map(q => [q.id, flat ? 3 : q.primaryDimension === 'investigative' ? 5 : q.primaryDimension === 'social' ? 4 : 2]));
      const snapshot = evaluate(c, group, answers); snapshot.integrity = { catalogSha256: release.sha256, answersSha256: hash(answers) };
      await as('authenticated', owner);
      const id = (await sql('select create_attempt($1,1405,$2) as id', ['دانش‌آموز ساختگی', group]))[0].id;
      await sql('select save_answers($1,0,$2::jsonb)', [id, JSON.stringify(answers)]);
      await sql('select submit_attempt($1,1)', [id]);
      await assert.rejects(sql('select complete_attempt($1,$2,$3::jsonb)', [id,'0.2.0',JSON.stringify(snapshot)]), /permission denied/);
      await as('authenticated', stranger);
      assert.equal((await sql('select * from attempts where id=$1', [id])).length, 0);
      assert.equal((await sql('select * from answers where attempt_id=$1', [id])).length, 0);
      await as('service_role');
      const bad = structuredClone(snapshot); bad.majorRanking[0].id = group === 'experimental' ? 'computer-engineering' : 'medicine';
      await assert.rejects(sql('select complete_attempt($1,$2,$3::jsonb)', [id,'0.2.0',JSON.stringify(bad)]), /ranking outside/);
      const wrongHash = structuredClone(snapshot); wrongHash.integrity.catalogSha256 = '0'.repeat(64);
      await assert.rejects(sql('select complete_attempt($1,$2,$3::jsonb)', [id,'0.2.0',JSON.stringify(wrongHash)]), /invalid result snapshot/);
      const missing = structuredClone(snapshot); delete missing.majorRanking[0].score;
      await assert.rejects(sql('select complete_attempt($1,$2,$3::jsonb)', [id,'0.2.0',JSON.stringify(missing)]), /invalid ranking score/);
      await as('authenticated', owner);
      assert.equal((await sql('select status from attempts where id=$1', [id]))[0].status, 'submitted');
      assert.equal((await sql('select * from results where attempt_id=$1', [id])).length, 0);
      await as('service_role');
      await sql('select complete_attempt($1,$2,$3::jsonb)', [id,'0.2.0',JSON.stringify(snapshot)]);
      const edited = structuredClone(snapshot); edited.explanations.title = 'must not replace';
      await sql('select complete_attempt($1,$2,$3::jsonb)', [id,'0.2.0',JSON.stringify(edited)]);
      await as('authenticated', owner);
      const stored = (await sql('select snapshot from results where attempt_id=$1', [id]))[0].snapshot;
      assert.deepEqual(stored, snapshot);
      assert.equal((await sql('select status from attempts where id=$1', [id]))[0].status, 'completed');
      await assert.rejects(sql('select save_answers($1,2,$2::jsonb)', [id,'{"Q-R-01":1}']), /attempt is closed/);
      await as('authenticated', stranger);
      assert.equal((await sql('select * from results where attempt_id=$1', [id])).length, 0);
      completed.push({ id, snapshot });
    }
    await as('postgres');
    const next = structuredClone(c); for (const part of Object.values(next)) part.catalogVersion = '0.2.1-pilot';
    await sql('insert into catalog_releases(version,sha256,payload,status) values ($1,$2,$3::jsonb,$4)', ['0.2.1-pilot',hash(next),JSON.stringify(next),'pilot']);
    await sql('insert into catalog_questions select $1,id,position,question_text,section,primary_dimension,groups from catalog_questions where catalog_version=$2', ['0.2.1-pilot',c.questions.catalogVersion]);
    await sql('update catalog_releases set sealed_at=now() where version=$1', ['0.2.1-pilot']);
    await sql('update active_catalog set catalog_version=$1', ['0.2.1-pilot']);
    await as('authenticated', owner);
    for (const { id, snapshot } of completed) assert.deepEqual((await sql('select snapshot from results where attempt_id=$1', [id]))[0].snapshot, snapshot);
  } finally { await db.close(); }
});
