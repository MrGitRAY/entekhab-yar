-- Matching v0.2: allow a withheld ranking when interests are undifferentiated.
-- Keep complete_attempt restricted to service_role. All validation and writing
-- occur under the attempt row lock; completed snapshots are never recalculated.
create or replace function public.complete_attempt(p_attempt_id uuid, p_engine_version text, p_snapshot jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  a public.attempts%rowtype;
  c public.catalog_releases%rowtype;
  flat boolean;
  expected_majors integer;
begin
  select * into a from public.attempts where id = p_attempt_id for update;
  if not found then raise exception 'attempt not found' using errcode = '22023'; end if;
  if a.status = 'completed' then return a.id; end if;
  if a.status <> 'submitted' then raise exception 'attempt not submitted' using errcode = '23514'; end if;
  select * into c from public.catalog_releases where version = a.catalog_version and sealed_at is not null;
  if p_snapshot is null or jsonb_typeof(p_snapshot) is distinct from 'object'
    or p_engine_version is distinct from '0.2.0'
    or p_snapshot->>'engineVersion' is distinct from p_engine_version
    or p_snapshot->>'schemaVersion' is distinct from '2'
    or p_snapshot->>'catalogVersion' is distinct from a.catalog_version
    or p_snapshot->>'examGroup' is distinct from a.exam_group
    or p_snapshot#>>'{integrity,catalogSha256}' is distinct from c.sha256
    or coalesce(p_snapshot#>>'{integrity,answersSha256}', '') !~ '^[0-9a-f]{64}$'
    or p_snapshot#>>'{evidence,status}' is distinct from 'unvalidated_pilot'
    or p_snapshot#>>'{method,id}' is distinct from 'riasec_profile_correlation_v1'
    or p_snapshot->>'status' is null
    or p_snapshot->>'status' not in ('exploratory', 'insufficient_interest_differentiation') then
    raise exception 'invalid result snapshot' using errcode = '22023';
  end if;
  if jsonb_typeof(p_snapshot->'profile') is distinct from 'object'
    or jsonb_typeof(p_snapshot->'explanations') is distinct from 'object'
    or jsonb_typeof(p_snapshot->'familyRanking') is distinct from 'array'
    or jsonb_typeof(p_snapshot->'majorRanking') is distinct from 'array'
    or jsonb_typeof(p_snapshot->'topFamilies') is distinct from 'array'
    or jsonb_typeof(p_snapshot->'topMajors') is distinct from 'array' then
    raise exception 'invalid result sections' using errcode = '22023';
  end if;
  flat := p_snapshot->>'status' = 'insufficient_interest_differentiation';
  select count(*) into expected_majors from jsonb_array_elements(c.payload#>'{majors,items}') m where m->'groups' ? a.exam_group;
  if jsonb_array_length(p_snapshot->'familyRanking') <> 5
    or jsonb_array_length(p_snapshot->'majorRanking') <> expected_majors
    or jsonb_array_length(p_snapshot->'topFamilies') <> (case when flat then 0 else 3 end)
    or jsonb_array_length(p_snapshot->'topMajors') <> (case when flat then 0 else 5 end) then
    raise exception 'invalid recommendation counts' using errcode = '22023';
  end if;
  if (select count(*) from jsonb_object_keys(p_snapshot->'profile')) <> 26
    or exists (select 1 from jsonb_array_elements(c.payload#>'{scoring,dimensions}') d where not (p_snapshot->'profile' ? (d->>'id')))
    or exists (select 1 from jsonb_each(p_snapshot->'profile') d where
      not case when jsonb_typeof(d.value->'score') = 'number' then (d.value->>'score')::numeric between 0 and 100 else false end) then
    raise exception 'invalid profile' using errcode = '22023';
  end if;
  if (select count(distinct f->>'id') from jsonb_array_elements(p_snapshot->'familyRanking') f) <> 5
    or exists (select 1 from jsonb_array_elements(p_snapshot->'familyRanking') f where not exists (
      select 1 from jsonb_array_elements(c.payload#>'{families,items}') v where v->>'id' = f->>'id' and v->>'group' = a.exam_group))
    or (select count(distinct m->>'id') from jsonb_array_elements(p_snapshot->'majorRanking') m) <> expected_majors
    or exists (select 1 from jsonb_array_elements(p_snapshot->'majorRanking') m where not exists (
      select 1 from jsonb_array_elements(c.payload#>'{majors,items}') v where v->>'id' = m->>'id' and v->>'familyId' = m->>'familyId' and v->'groups' ? a.exam_group)) then
    raise exception 'ranking outside exam group' using errcode = '22023';
  end if;
  if exists (select 1 from jsonb_array_elements((p_snapshot->'familyRanking') || (p_snapshot->'majorRanking')) r where
    not coalesce(case when flat then r->'score' = 'null'::jsonb and r->'rank' = 'null'::jsonb
      when jsonb_typeof(r->'score') = 'number' and jsonb_typeof(r->'rank') = 'number' then (r->>'score')::numeric between 0 and 100 and (r->>'rank')::numeric >= 1
      else false end, false)) then
    raise exception 'invalid ranking score' using errcode = '22023';
  end if;
  if (select count(distinct f->>'id') from jsonb_array_elements(p_snapshot->'topFamilies') f) <> (case when flat then 0 else 3 end)
    or (select count(distinct m->>'id') from jsonb_array_elements(p_snapshot->'topMajors') m) <> (case when flat then 0 else 5 end)
    or exists (select 1 from jsonb_array_elements(p_snapshot->'topFamilies') f where not (p_snapshot->'familyRanking' @> jsonb_build_array(f)))
    or exists (select 1 from jsonb_array_elements(p_snapshot->'topMajors') m where
      not (p_snapshot->'majorRanking' @> jsonb_build_array(m)) or not exists (
        select 1 from jsonb_array_elements(p_snapshot->'topFamilies') f where f->>'id' = m->>'familyId')) then
    raise exception 'recommendation outside selected families or ranking' using errcode = '22023';
  end if;
  insert into public.results(attempt_id, engine_version, snapshot) values (a.id, p_engine_version, p_snapshot);
  update public.attempts set status = 'completed', completed_at = now(), updated_at = now() where id = a.id;
  return a.id;
end;
$$;
revoke execute on function public.complete_attempt(uuid, text, jsonb) from public, anon, authenticated;
grant execute on function public.complete_attempt(uuid, text, jsonb) to service_role;

