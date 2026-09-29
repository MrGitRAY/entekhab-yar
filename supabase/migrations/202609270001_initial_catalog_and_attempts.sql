-- Entekhab Yar, schema v1. Apply to a dedicated Supabase project.
-- JSON payloads are loaded separately by supabase/seed.sql after validation.

create table public.catalog_releases (
  version text primary key,
  sha256 text not null unique check (sha256 ~ '^[0-9a-f]{64}$'),
  payload jsonb not null check (
    jsonb_typeof(payload) = 'object'
    and payload ?& array['questions', 'families', 'majors', 'scoring', 'report_templates']
    and (payload->'questions'->>'catalogVersion') is not distinct from version
    and (payload->'families'->>'catalogVersion') is not distinct from version
    and (payload->'majors'->>'catalogVersion') is not distinct from version
    and (payload->'scoring'->>'catalogVersion') is not distinct from version
    and (payload->'report_templates'->>'catalogVersion') is not distinct from version
  ),
  status text not null check (status in ('pilot', 'published')),
  created_at timestamptz not null default now(),
  sealed_at timestamptz
);

create table public.catalog_questions (
  catalog_version text not null references public.catalog_releases(version),
  id text not null,
  position integer not null check (position > 0),
  question_text text not null check (length(btrim(question_text)) > 0),
  section text not null,
  primary_dimension text not null,
  groups text[] not null check (
    cardinality(groups) > 0
    and groups <@ array['experimental', 'mathematics']::text[]
  ),
  primary key (catalog_version, id),
  unique (catalog_version, position)
);

create table public.active_catalog (
  singleton boolean primary key default true check (singleton),
  catalog_version text not null references public.catalog_releases(version),
  updated_at timestamptz not null default now()
);

create table public.attempts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null check (length(btrim(display_name)) between 1 and 80),
  exam_year integer not null check (exam_year between 1400 and 1500),
  exam_group text not null check (exam_group in ('experimental', 'mathematics')),
  catalog_version text not null references public.catalog_releases(version),
  status text not null default 'draft' check (status in ('draft', 'submitted', 'completed')),
  revision integer not null default 0 check (revision >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  submitted_at timestamptz,
  completed_at timestamptz,
  unique (id, catalog_version),
  check (
    (status = 'draft' and submitted_at is null and completed_at is null)
    or (status = 'submitted' and submitted_at is not null and completed_at is null)
    or (status = 'completed' and submitted_at is not null and completed_at is not null)
  )
);

create index attempts_owner_created_idx on public.attempts (owner_id, created_at desc);

create table public.answers (
  attempt_id uuid not null,
  catalog_version text not null,
  question_id text not null,
  value smallint not null check (value between 1 and 5),
  answered_at timestamptz not null default now(),
  primary key (attempt_id, question_id),
  foreign key (attempt_id, catalog_version)
    references public.attempts(id, catalog_version) on delete cascade,
  foreign key (catalog_version, question_id)
    references public.catalog_questions(catalog_version, id)
);

create table public.results (
  attempt_id uuid primary key references public.attempts(id) on delete cascade,
  engine_version text not null check (length(btrim(engine_version)) > 0),
  snapshot jsonb not null check (
    jsonb_typeof(snapshot) = 'object'
    and snapshot ?& array['catalogVersion', 'examGroup', 'profile', 'familyRanking',
      'majorRanking', 'topFamilies', 'topMajors', 'explanations']
  ),
  created_at timestamptz not null default now()
);

-- Once sealed, a release and its questions cannot be changed. A new release
-- is needed for corrections, preserving the basis of existing reports.
create function public.guard_catalog_release()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'DELETE' then
    if old.sealed_at is not null then
      raise exception 'sealed catalog cannot be deleted' using errcode = '23514';
    end if;
    return old;
  end if;
  if old.sealed_at is not null
    or new.sealed_at is null
    or (to_jsonb(new) - 'sealed_at') <> (to_jsonb(old) - 'sealed_at') then
    raise exception 'catalog can only be sealed once' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger catalog_release_guard before update or delete on public.catalog_releases
for each row execute function public.guard_catalog_release();

create function public.guard_catalog_question()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_version text;
begin
  if tg_op in ('UPDATE', 'DELETE') then
    v_version := old.catalog_version;
    if exists (select 1 from public.catalog_releases where version = v_version and sealed_at is not null) then
      raise exception 'sealed catalog questions cannot change' using errcode = '23514';
    end if;
  end if;
  if tg_op in ('UPDATE', 'INSERT') then
    v_version := new.catalog_version;
    if exists (select 1 from public.catalog_releases where version = v_version and sealed_at is not null) then
      raise exception 'sealed catalog questions cannot change' using errcode = '23514';
    end if;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

create trigger catalog_question_guard before insert or update or delete on public.catalog_questions
for each row execute function public.guard_catalog_question();

-- Catalog activation is a privileged deployment operation. End-user RPCs
-- can only use a sealed active release.
create function public.create_attempt(p_display_name text, p_exam_year integer, p_exam_group text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_owner uuid; v_version text; v_id uuid;
begin
  v_owner := auth.uid();
  if v_owner is null then raise exception 'authentication required' using errcode = '42501'; end if;
  if p_display_name is null or length(btrim(p_display_name)) not between 1 and 80 then
    raise exception 'invalid display name' using errcode = '22023';
  end if;
  if p_exam_year is null or p_exam_year not between 1400 and 1500 then
    raise exception 'invalid exam year' using errcode = '22023';
  end if;
  if p_exam_group is null or p_exam_group not in ('experimental', 'mathematics') then
    raise exception 'invalid exam group' using errcode = '22023';
  end if;
  select r.version into v_version
    from public.active_catalog a join public.catalog_releases r on r.version = a.catalog_version
    where a.singleton = true and r.sealed_at is not null;
  if v_version is null then raise exception 'no active catalog' using errcode = '23514'; end if;
  if (select count(*) from public.catalog_questions q
      where q.catalog_version = v_version and p_exam_group = any(q.groups)) not between 50 and 60 then
    raise exception 'catalog question count invalid' using errcode = '23514';
  end if;
  insert into public.attempts (owner_id, display_name, exam_year, exam_group, catalog_version)
  values (v_owner, btrim(p_display_name), p_exam_year, p_exam_group, v_version)
  returning id into v_id;
  return v_id;
end;
$$;

-- p_answers is a JSON object, for example {"Q-R-01": 4}. Expected revision
-- makes retries safe: a stale request receives a conflict rather than
-- overwriting newer answers. The caller can read back its current revision.
create function public.save_answers(p_attempt_id uuid, p_expected_revision integer, p_answers jsonb)
returns integer language plpgsql security definer set search_path = '' as $$
declare v_attempt public.attempts%rowtype; v_count integer;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode = '42501'; end if;
  select * into v_attempt from public.attempts where id = p_attempt_id for update;
  if not found or v_attempt.owner_id <> auth.uid() then
    raise exception 'attempt not found' using errcode = '42501';
  end if;
  if v_attempt.status <> 'draft' then raise exception 'attempt is closed' using errcode = '23514'; end if;
  if p_expected_revision is distinct from v_attempt.revision then
    raise exception 'revision conflict' using errcode = '40001';
  end if;
  if p_answers is null or jsonb_typeof(p_answers) <> 'object' then
    raise exception 'answers must be an object' using errcode = '22023';
  end if;
  select count(*) into v_count from jsonb_each(p_answers);
  if v_count not between 1 and 60 then raise exception 'invalid answer count' using errcode = '22023'; end if;
  if exists (
    select 1 from jsonb_each(p_answers) e
    where not case when jsonb_typeof(e.value) = 'number' then
      (e.value::text)::numeric between 1 and 5
      and (e.value::text)::numeric = floor((e.value::text)::numeric)
    else false end
  ) then raise exception 'answers must be integers from 1 to 5' using errcode = '22023'; end if;
  if exists (
    select 1 from jsonb_each(p_answers) e
    left join public.catalog_questions q
      on q.catalog_version = v_attempt.catalog_version
      and q.id = e.key
      and v_attempt.exam_group = any(q.groups)
    where q.id is null
  ) then raise exception 'question is not in this exam group' using errcode = '22023'; end if;
  insert into public.answers (attempt_id, catalog_version, question_id, value)
    select v_attempt.id, v_attempt.catalog_version, e.key, (e.value::text)::smallint
    from jsonb_each(p_answers) e
    on conflict (attempt_id, question_id) do update
      set value = excluded.value, answered_at = now();
  update public.attempts set revision = revision + 1, updated_at = now()
    where id = v_attempt.id returning revision into v_count;
  return v_count;
end;
$$;

create function public.submit_attempt(p_attempt_id uuid, p_expected_revision integer)
returns text language plpgsql security definer set search_path = '' as $$
declare v_attempt public.attempts%rowtype; v_expected integer; v_actual integer;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode = '42501'; end if;
  select * into v_attempt from public.attempts where id = p_attempt_id for update;
  if not found or v_attempt.owner_id <> auth.uid() then
    raise exception 'attempt not found' using errcode = '42501';
  end if;
  if v_attempt.status <> 'draft' then return v_attempt.status; end if;
  if p_expected_revision is distinct from v_attempt.revision then
    raise exception 'revision conflict' using errcode = '40001';
  end if;
  select count(*) into v_expected from public.catalog_questions q
    where q.catalog_version = v_attempt.catalog_version and v_attempt.exam_group = any(q.groups);
  select count(*) into v_actual from public.answers where attempt_id = v_attempt.id;
  if v_expected not between 50 and 60 or v_actual <> v_expected then
    raise exception 'all questions must be answered' using errcode = '23514';
  end if;
  update public.attempts
    set status = 'submitted', revision = revision + 1, submitted_at = now(), updated_at = now()
    where id = v_attempt.id;
  return 'submitted';
end;
$$;

-- The matching service uses a server-side service-role client only after it
-- has loaded the immutable submitted answers. The function is one transaction.
create function public.complete_attempt(p_attempt_id uuid, p_engine_version text, p_snapshot jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_attempt public.attempts%rowtype; v_catalog jsonb;
begin
  select * into v_attempt from public.attempts where id = p_attempt_id for update;
  if not found then raise exception 'attempt not found' using errcode = '22023'; end if;
  if v_attempt.status = 'completed' then return v_attempt.id; end if;
  if v_attempt.status <> 'submitted' then raise exception 'attempt not submitted' using errcode = '23514'; end if;
  if p_engine_version is null or length(btrim(p_engine_version)) = 0
    or p_snapshot is null or jsonb_typeof(p_snapshot) is distinct from 'object'
    or not (p_snapshot ?& array['catalogVersion', 'examGroup', 'profile',
      'familyRanking', 'majorRanking', 'topFamilies', 'topMajors', 'explanations'])
    or p_snapshot->>'catalogVersion' is distinct from v_attempt.catalog_version
    or p_snapshot->>'examGroup' is distinct from v_attempt.exam_group then
    raise exception 'invalid result snapshot' using errcode = '22023';
  end if;
  if jsonb_typeof(p_snapshot->'profile') is distinct from 'object'
    or jsonb_typeof(p_snapshot->'familyRanking') is distinct from 'array'
    or jsonb_typeof(p_snapshot->'majorRanking') is distinct from 'array'
    or jsonb_typeof(p_snapshot->'topFamilies') is distinct from 'array'
    or jsonb_typeof(p_snapshot->'topMajors') is distinct from 'array'
    or jsonb_typeof(p_snapshot->'explanations') is distinct from 'object' then
    raise exception 'invalid result sections' using errcode = '22023';
  end if;
  if jsonb_array_length(p_snapshot->'topFamilies') <> 3
    or jsonb_array_length(p_snapshot->'topMajors') <> 5 then
    raise exception 'invalid recommendation counts' using errcode = '22023';
  end if;
  select payload into v_catalog from public.catalog_releases
    where version = v_attempt.catalog_version;
  if (select count(distinct f->>'id') from jsonb_array_elements(p_snapshot->'topFamilies') f) <> 3
    or exists (
      select 1 from jsonb_array_elements(p_snapshot->'topFamilies') f
      where not exists (
        select 1 from jsonb_array_elements(v_catalog->'families'->'items') c
        where c->>'id' = f->>'id' and c->>'group' = v_attempt.exam_group
      )
    ) then
    raise exception 'recommendation family outside exam group' using errcode = '22023';
  end if;
  if (select count(distinct m->>'id') from jsonb_array_elements(p_snapshot->'topMajors') m) <> 5
    or exists (
      select 1 from jsonb_array_elements(p_snapshot->'topMajors') m
      where not exists (
        select 1 from jsonb_array_elements(v_catalog->'majors'->'items') c
        where c->>'id' = m->>'id'
          and c->>'familyId' = m->>'familyId'
          and c->'groups' ? v_attempt.exam_group
      )
      or not exists (
        select 1 from jsonb_array_elements(p_snapshot->'topFamilies') f
        where f->>'id' = m->>'familyId'
      )
    ) then
    raise exception 'recommendation major outside selected families or exam group' using errcode = '22023';
  end if;
  insert into public.results (attempt_id, engine_version, snapshot)
    values (v_attempt.id, p_engine_version, p_snapshot);
  update public.attempts
    set status = 'completed', completed_at = now(), updated_at = now()
    where id = v_attempt.id;
  return v_attempt.id;
end;
$$;

alter table public.catalog_releases enable row level security;
alter table public.catalog_questions enable row level security;
alter table public.active_catalog enable row level security;
alter table public.attempts enable row level security;
alter table public.answers enable row level security;
alter table public.results enable row level security;

create policy catalog_release_read on public.catalog_releases for select to authenticated
  using (sealed_at is not null);
create policy catalog_question_read on public.catalog_questions for select to authenticated
  using (exists (select 1 from public.catalog_releases r
    where r.version = catalog_version and r.sealed_at is not null));
create policy attempt_owner_read on public.attempts for select to authenticated
  using (owner_id = (select auth.uid()));
create policy answer_owner_read on public.answers for select to authenticated
  using (exists (select 1 from public.attempts a
    where a.id = attempt_id and a.owner_id = (select auth.uid())));
create policy result_owner_read on public.results for select to authenticated
  using (exists (select 1 from public.attempts a
    where a.id = attempt_id and a.owner_id = (select auth.uid())));

revoke all on public.catalog_releases, public.catalog_questions, public.active_catalog,
  public.attempts, public.answers, public.results from anon, authenticated;
grant select on public.catalog_releases, public.catalog_questions,
  public.attempts, public.answers, public.results to authenticated;

revoke execute on function public.guard_catalog_release(), public.guard_catalog_question(),
  public.create_attempt(text, integer, text), public.save_answers(uuid, integer, jsonb),
  public.submit_attempt(uuid, integer), public.complete_attempt(uuid, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.create_attempt(text, integer, text),
  public.save_answers(uuid, integer, jsonb), public.submit_attempt(uuid, integer)
  to authenticated;
grant execute on function public.complete_attempt(uuid, text, jsonb) to service_role;
