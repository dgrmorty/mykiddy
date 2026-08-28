-- Launch hardening: moderation, PII-adjacent graph, XP, quiz, approvals.

begin;

-- Existing students stay usable; block flag is explicit false.
update public.profiles
set is_approved = true
where coalesce(is_approved, false) = false;

alter table public.profiles alter column is_approved set default true;

create or replace function public.admin_set_user_approved(p_user_id uuid, p_approved boolean)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if not public.is_admin_user() then
    raise exception 'forbidden';
  end if;
  if p_user_id is null then
    raise exception 'invalid user';
  end if;
  update public.profiles
  set is_approved = coalesce(p_approved, true), updated_at = now()
  where id = p_user_id;
  if not found then
    raise exception 'profile not found';
  end if;
end;
$function$;

revoke all on function public.admin_set_user_approved(uuid, boolean) from public;
revoke all on function public.admin_set_user_approved(uuid, boolean) from anon;
grant execute on function public.admin_set_user_approved(uuid, boolean) to authenticated;

-- Showcase: students may only insert pending posts.
drop policy if exists "project_posts_insert_student_own" on public.project_posts;
create policy "project_posts_insert_student_own"
  on public.project_posts for insert
  to authenticated
  with check (
    author_id = (select auth.uid())
    and status = 'pending'
    and exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid())
        and lower(trim(coalesce(p.role::text, ''))) = 'student'
        and coalesce(p.is_approved, true) = true
    )
  );

-- Homework: students may only insert pending work with no self-awarded XP.
drop policy if exists "Users can insert own homework submissions" on public.homework_submissions;
create policy "Users can insert own homework submissions"
  on public.homework_submissions for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and coalesce(status, 'pending') = 'pending'
    and coalesce(xp_awarded, 0) = 0
    and exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and coalesce(p.is_approved, true) = true
    )
  );

-- Friendships: insert pending only; only addressee may accept.
drop policy if exists "friendships_insert_as_requester" on public.friendships;
create policy "friendships_insert_as_requester"
  on public.friendships for insert
  to authenticated
  with check (
    (select auth.uid()) = requester_id
    and status = 'pending'
    and requester_id <> addressee_id
  );

drop policy if exists "friendships_update_parties" on public.friendships;
create policy "friendships_update_addressee_accept"
  on public.friendships for update
  to authenticated
  using (
    (select auth.uid()) = addressee_id
    and status = 'pending'
  )
  with check (
    (select auth.uid()) = addressee_id
    and status = 'accepted'
  );

-- Storage: no listing of other children's unmoderated files.
drop policy if exists "project_showcase read" on storage.objects;
create policy "project_showcase read own or approved"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'project_showcase'
    and (
      split_part(name, '/', 1) = (select auth.uid())::text
      or public.is_admin_user()
      or exists (
        select 1
        from public.project_posts pp
        where pp.status = 'approved'
          and pp.media is not null
          and pp.media::text like '%' || name || '%'
      )
    )
  );

drop policy if exists "project_showcase update own" on storage.objects;

-- XP only when a new user_progress row is created.
create or replace function public.increment_xp(x_val integer)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  raise exception 'increment_xp is disabled; use complete_lesson_award';
end;
$function$;

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

revoke all on function public.complete_lesson_award(uuid) from public;
revoke all on function public.complete_lesson_award(uuid) from anon;
grant execute on function public.complete_lesson_award(uuid) to authenticated;

-- Quiz XP only for cues that exist on the lesson.
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
  if p_lesson_id is null or p_cue_id is null or length(trim(p_cue_id)) = 0 then
    raise exception 'Invalid quiz cue';
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

create unique index if not exists user_progress_user_lesson_uidx
  on public.user_progress (user_id, lesson_id);

-- Backfill quiz cue ids so claim_lesson_quiz_cue can match client-generated ids.
update public.lessons
set quiz_cues = (
  select coalesce(jsonb_agg(
    case
      when coalesce(e->>'id', '') <> '' then e
      else e || jsonb_build_object(
        'id',
        'cue_' || (ord - 1)::text || '_' || coalesce(e->>'time_sec', e->>'timeSec', '0')
      )
    end
    order by ord
  ), '[]'::jsonb)
  from jsonb_array_elements(coalesce(quiz_cues, '[]'::jsonb)) with ordinality as t(e, ord)
)
where quiz_cues is not null
  and jsonb_typeof(quiz_cues) = 'array';

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
declare
  user_name text;
  avatar_letter text;
begin
  user_name := coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1));
  avatar_letter := coalesce(left(trim(user_name), 1), 'U');
  if avatar_letter = '' then avatar_letter := 'U'; end if;
  insert into public.profiles (id, email, name, role, avatar, is_approved)
  values (
    new.id,
    new.email,
    user_name,
    'Student',
    coalesce(
      new.raw_user_meta_data->>'avatar',
      'https://ui-avatars.com/api/?name=' || avatar_letter || '&background=random'
    ),
    true
  )
  on conflict (id) do nothing;
  return new;
exception
  when others then
    raise warning 'handle_new_user error for %: %', new.id, sqlerrm;
    return new;
end;
$function$;

create or replace function public.list_leaderboard(p_limit integer default 50)
returns table (
  id uuid,
  name text,
  avatar text,
  xp integer,
  level integer,
  role text
)
language sql
stable
security definer
set search_path to 'public'
as $$
  select p.id, p.name, p.avatar, p.xp, p.level, p.role::text
  from public.profiles p
  where lower(trim(coalesce(p.role::text, ''))) = 'student'
  order by p.xp desc nulls last
  limit greatest(1, least(coalesce(p_limit, 50), 100));
$$;

commit;
