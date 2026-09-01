-- Secure lesson_materials storage (admin-only writes) and block XP farming via RPC.

create or replace function public.lesson_is_unlocked_for_user(p_user_id uuid, p_lesson_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $function$
declare
  prev_lesson_id uuid;
begin
  if p_user_id is null or p_lesson_id is null then
    return false;
  end if;

  select pl.id
    into prev_lesson_id
  from public.lessons cl
  join public.lessons pl
    on pl.module_id = cl.module_id
   and pl.created_at < cl.created_at
  where cl.id = p_lesson_id
  order by pl.created_at desc
  limit 1;

  if prev_lesson_id is null then
    return true;
  end if;

  return exists (
    select 1
    from public.user_progress up
    where up.user_id = p_user_id
      and up.lesson_id = prev_lesson_id
  );
end;
$function$;

revoke all on function public.lesson_is_unlocked_for_user(uuid, uuid) from public;
revoke all on function public.lesson_is_unlocked_for_user(uuid, uuid) from anon;
revoke all on function public.lesson_is_unlocked_for_user(uuid, uuid) from authenticated;

create or replace function public.complete_lesson_award(p_lesson_id uuid)
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  uid uuid := (select auth.uid());
  n int := 0;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;
  if p_lesson_id is null then
    raise exception 'Invalid lesson';
  end if;
  if not exists (
    select 1 from public.profiles p
    where p.id = uid and coalesce(p.is_approved, true) = true
  ) then
    raise exception 'not approved';
  end if;
  if not exists (select 1 from public.lessons l where l.id = p_lesson_id) then
    raise exception 'lesson not found';
  end if;
  if not public.lesson_is_unlocked_for_user(uid, p_lesson_id) then
    raise exception 'lesson locked';
  end if;

  insert into public.user_progress (user_id, lesson_id)
  values (uid, p_lesson_id)
  on conflict (user_id, lesson_id) do nothing;

  get diagnostics n = row_count;
  if n > 0 then
    update public.profiles
    set
      xp = coalesce(xp, 0) + 50,
      level = (greatest(coalesce(xp, 0) + 50, 0) / 500) + 1
    where id = uid;
  end if;
  return true;
end;
$function$;

create or replace function public.claim_lesson_quiz_cue(
  p_lesson_id uuid,
  p_cue_id text,
  p_first_try boolean default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := (select auth.uid());
  new_cue text;
  had_miss boolean := false;
  award int := 0;
  cue_ok boolean := false;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;
  if not exists (
    select 1 from public.profiles p
    where p.id = uid and coalesce(p.is_approved, true) = true
  ) then
    raise exception 'not approved';
  end if;
  if p_lesson_id is null or p_cue_id is null or length(trim(p_cue_id)) = 0 then
    raise exception 'Invalid quiz cue';
  end if;
  if not public.lesson_is_unlocked_for_user(uid, p_lesson_id) then
    raise exception 'lesson locked';
  end if;

  select exists (
    select 1
    from public.lessons l,
    lateral jsonb_array_elements(coalesce(l.quiz_cues, '[]'::jsonb)) e
    where l.id = p_lesson_id
      and (e->>'id') = trim(p_cue_id)
  ) into cue_ok;
  if not cue_ok then
    raise exception 'Unknown quiz cue';
  end if;

  select exists (
    select 1 from public.lesson_quiz_misses m
    where m.user_id = uid and m.lesson_id = p_lesson_id and m.cue_id = trim(p_cue_id)
  ) into had_miss;

  insert into public.lesson_quiz_completions (user_id, lesson_id, cue_id, first_try, xp_awarded)
  values (uid, p_lesson_id, trim(p_cue_id), not had_miss, 0)
  on conflict (user_id, lesson_id, cue_id) do nothing
  returning cue_id into new_cue;

  if new_cue is null then
    return jsonb_build_object(
      'ok', true,
      'already', true,
      'awarded', false,
      'xp', 0,
      'first_try', false
    );
  end if;

  if not had_miss then
    award := 1;
    update public.lesson_quiz_completions
    set xp_awarded = 1, first_try = true
    where user_id = uid and lesson_id = p_lesson_id and cue_id = trim(p_cue_id);

    update public.profiles
    set
      xp = coalesce(xp, 0) + 1,
      level = (greatest(coalesce(xp, 0) + 1, 0) / 500) + 1
    where id = uid;
  else
    update public.lesson_quiz_completions
    set xp_awarded = 0, first_try = false
    where user_id = uid and lesson_id = p_lesson_id and cue_id = trim(p_cue_id);
  end if;

  return jsonb_build_object(
    'ok', true,
    'already', false,
    'awarded', award > 0,
    'xp', award,
    'first_try', not had_miss
  );
end;
$$;

-- Revert open storage writes: only DB admins (profiles.role = admin).
drop policy if exists "lesson_materials insert authenticated" on storage.objects;
drop policy if exists "lesson_materials update authenticated" on storage.objects;
drop policy if exists "lesson_materials delete authenticated" on storage.objects;

drop policy if exists "lesson_materials insert admin" on storage.objects;
create policy "lesson_materials insert admin"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'lesson_materials'
    and public.is_admin_user()
  );

drop policy if exists "lesson_materials update admin" on storage.objects;
create policy "lesson_materials update admin"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'lesson_materials'
    and public.is_admin_user()
  )
  with check (
    bucket_id = 'lesson_materials'
    and public.is_admin_user()
  );

drop policy if exists "lesson_materials delete admin" on storage.objects;
create policy "lesson_materials delete admin"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'lesson_materials'
    and public.is_admin_user()
  );
