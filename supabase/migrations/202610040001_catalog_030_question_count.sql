-- Entekhab Yar catalog 0.3.0-pilot: 70 questions per exam group.
-- Existing releases remain immutable; apply this after the original migrations and before seed.sql.
create or replace function public.create_attempt(p_display_name text, p_exam_year integer, p_exam_group text)
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
      where q.catalog_version = v_version and p_exam_group = any(q.groups)) not between 50 and 70 then
    raise exception 'catalog question count invalid' using errcode = '23514';
  end if;
  insert into public.attempts (owner_id, display_name, exam_year, exam_group, catalog_version)
  values (v_owner, btrim(p_display_name), p_exam_year, p_exam_group, v_version)
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.save_answers(p_attempt_id uuid, p_expected_revision integer, p_answers jsonb)
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
  if v_count not between 1 and 74 then raise exception 'invalid answer count' using errcode = '22023'; end if;
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

create or replace function public.submit_attempt(p_attempt_id uuid, p_expected_revision integer)
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
  if v_expected not between 50 and 70 or v_actual <> v_expected then
    raise exception 'all questions must be answered' using errcode = '23514';
  end if;
  update public.attempts
    set status = 'submitted', revision = revision + 1, submitted_at = now(), updated_at = now()
    where id = v_attempt.id;
  return 'submitted';
end;
$$;
