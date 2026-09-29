import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

let PGlite;
try {
  ({ PGlite } = await import('../.db-validation/node_modules/@electric-sql/pglite/dist/index.js'));
} catch {
  test('database integration (install optional PGlite first)', { skip: 'PGlite is not installed' }, () => {});
}

if (PGlite) test('migration, catalog seed, RPC and owner isolation', async () => {
  const pg = new PGlite();
  const owner = '11111111-1111-4111-8111-111111111111';
  const stranger = '22222222-2222-4222-8222-222222222222';
  const sql = async (source, params = []) => (await pg.query(source, params)).rows;
  const claim = async (role, id = '') => {
    await pg.exec(`set role ${role};`);
    await sql('select set_config($1, $2, false)', ['request.jwt.claim.sub', id]);
  };
  try {
    await pg.exec(`
      create role anon;
      create role authenticated;
      create role service_role;
      create schema auth;
      create table auth.users (id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$
        select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
      $$;
      grant usage on schema public, auth to anon, authenticated, service_role;
    `);
    const migration = await readFile(new URL('../supabase/migrations/202609270001_initial_catalog_and_attempts.sql', import.meta.url), 'utf8');
    await pg.exec(migration);
    const seed = await readFile(new URL('../data/releases/0.1.0-pilot/seed.sql', import.meta.url), 'utf8');
    await pg.exec(seed);
    await pg.exec(seed); // Same hash may be reapplied without changing the catalog.
    assert.equal((await sql('select count(*)::int as n from public.catalog_questions'))[0].n, 64);
    assert.equal((await sql('select count(*)::int as n from public.catalog_releases where sealed_at is not null'))[0].n, 1);
    await sql('insert into auth.users(id) values ($1), ($2)', [owner, stranger]);

    await claim('anon');
    await assert.rejects(sql("select public.create_attempt('بدون نشست', 1405, 'experimental')"), /permission denied/);
    await claim('authenticated');
    await assert.rejects(sql("select public.create_attempt('بدون هویت', 1405, 'experimental')"), /authentication required/);

    await claim('authenticated', owner);
    const attemptId = (await sql("select public.create_attempt('دانش‌آموز آزمایشی', 1405, 'experimental') as id"))[0].id;
    const first = await sql('select public.save_answers($1, 0, $2::jsonb) as revision', [attemptId, JSON.stringify({ 'Q-R-01': 4 })]);
    assert.equal(first[0].revision, 1);
    await assert.rejects(sql('select public.save_answers($1, 1, $2::jsonb)', [attemptId, JSON.stringify({ 'Q-MAT-01': 5 })]), /question is not in this exam group/);
    await assert.rejects(sql('select public.save_answers($1, 0, $2::jsonb)', [attemptId, JSON.stringify({ 'Q-R-01': 5 })]), /revision conflict/);
    await assert.rejects(sql('select public.submit_attempt($1, 1)', [attemptId]), /all questions must be answered/);
    await assert.rejects(sql("insert into public.answers(attempt_id, catalog_version, question_id, value) values ($1, '0.1.0-pilot', 'Q-R-01', 5)", [attemptId]), /permission denied/);
    await assert.rejects(sql('select public.complete_attempt($1, $2, $3::jsonb)', [attemptId, 'v1', '{}']), /permission denied/);

    const questionIds = (await sql("select id from public.catalog_questions where catalog_version = '0.1.0-pilot' and 'experimental' = any(groups)")).map((row) => row.id);
    assert.equal(questionIds.length, 60);
    const answers = Object.fromEntries(questionIds.map((id) => [id, 4]));
    assert.equal((await sql('select public.save_answers($1, 1, $2::jsonb) as revision', [attemptId, JSON.stringify(answers)]))[0].revision, 2);
    assert.equal((await sql('select public.submit_attempt($1, 2) as status', [attemptId]))[0].status, 'submitted');
    assert.equal((await sql('select public.submit_attempt($1, 2) as status', [attemptId]))[0].status, 'submitted');
    await assert.rejects(sql('select public.save_answers($1, 3, $2::jsonb)', [attemptId, JSON.stringify({ 'Q-R-01': 5 })]), /attempt is closed/);

    await claim('authenticated', stranger);
    assert.equal((await sql('select count(*)::int as n from public.attempts'))[0].n, 0);
    assert.equal((await sql('select count(*)::int as n from public.answers'))[0].n, 0);
    await assert.rejects(sql('select public.save_answers($1, 3, $2::jsonb)', [attemptId, JSON.stringify({ 'Q-R-01': 5 })]), /attempt not found/);

    await claim('service_role');
    const snapshot = {
      catalogVersion: '0.1.0-pilot', examGroup: 'experimental', profile: {},
      familyRanking: [], majorRanking: [],
      topFamilies: [{ id: 'exp-health' }, { id: 'exp-rehab' }, { id: 'exp-clinical' }],
      topMajors: [
        { id: 'medicine', familyId: 'exp-health' },
        { id: 'dentistry', familyId: 'exp-health' },
        { id: 'physiotherapy', familyId: 'exp-rehab' },
        { id: 'laboratory-sciences', familyId: 'exp-clinical' },
        { id: 'radiology', familyId: 'exp-clinical' },
      ],
      explanations: {},
    };
    await assert.rejects(sql('select public.complete_attempt($1, $2, $3::jsonb)', [attemptId, 'v1', JSON.stringify({ ...snapshot, examGroup: 'mathematics' })]), /invalid result snapshot/);
    const mixed = structuredClone(snapshot);
    mixed.topMajors[0] = { id: 'computer-engineering', familyId: 'math-tech' };
    await assert.rejects(sql('select public.complete_attempt($1, $2, $3::jsonb)', [attemptId, 'v1', JSON.stringify(mixed)]), /outside selected families or exam group/);
    assert.equal((await sql('select public.complete_attempt($1, $2, $3::jsonb) as id', [attemptId, 'v1', JSON.stringify(snapshot)]))[0].id, attemptId);
    assert.equal((await sql('select public.complete_attempt($1, $2, $3::jsonb) as id', [attemptId, 'v1', JSON.stringify(snapshot)]))[0].id, attemptId);

    await claim('authenticated', owner);
    assert.equal((await sql('select count(*)::int as n from public.results'))[0].n, 1);
    await claim('authenticated', stranger);
    assert.equal((await sql('select count(*)::int as n from public.results'))[0].n, 0);
    await claim('postgres');
    await assert.rejects(sql("update public.catalog_releases set status = 'published' where version = '0.1.0-pilot'"), /catalog can only be sealed once/);
  } finally {
    await pg.close();
  }
});
