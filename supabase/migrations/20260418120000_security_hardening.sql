-- Безопасность: админ = profiles.role, жёсткий increment_xp, отзыв peer-чтения ДЗ/прогресса,
-- сжатие политик profiles, лайки без «select true», индексы FK, search_path у функций, GRANT на RPC.

begin;

-- ---------------------------------------------------------------------------
-- Функции: search_path, increment_xp только +50, is_admin_user = role в profiles
-- ---------------------------------------------------------------------------

create or replace function public.is_admin_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and lower(trim(coalesce(p.role::text, ''))) = 'admin'
  );
$$;

create or replace function public.increment_xp(x_val integer)
returns void
language plpgsql
security definer
set search_path = public
as $function$
begin
  if (select auth.uid()) is null then
    raise exception 'Not authenticated';
  end if;
  if x_val is null or x_val <> 50 then
    raise exception 'Invalid xp increment (allowed: 50)';
  end if;
  update public.profiles
  set
    xp = coalesce(xp, 0) + 50,
    level = (greatest(coalesce(xp, 0) + 50, 0) / 500) + 1
  where id = (select auth.uid());
end;
$function$;

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
  insert into public.profiles (id, email, name, role, avatar)
  values (
    new.id,
    new.email,
    user_name,
    coalesce(new.raw_user_meta_data->>'role', 'Student'),
    coalesce(
      new.raw_user_meta_data->>'avatar',
      'https://ui-avatars.com/api/?name=' || avatar_letter || '&background=random'
    )
  )
  on conflict (id) do nothing;
  return new;
exception
  when others then
    raise warning 'handle_new_user error for %: %', new.id, sqlerrm;
    return new;
end;
$function$;

create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
set search_path = public
as $function$
begin
  new.updated_at := now();
  return new;
end;
$function$;

-- ---------------------------------------------------------------------------
-- GRANT: убрать вызов опасных RPC у anon/PUBLIC; триггеры не затрагиваются
-- ---------------------------------------------------------------------------

revoke all on function public.increment_xp(integer) from public;
revoke all on function public.increment_xp(integer) from anon;
grant execute on function public.increment_xp(integer) to authenticated;

revoke all on function public.delete_user_by_admin(uuid) from public;
revoke all on function public.delete_user_by_admin(uuid) from anon;
grant execute on function public.delete_user_by_admin(uuid) to authenticated;

revoke all on function public.get_all_users() from public;
revoke all on function public.get_all_users() from anon;
grant execute on function public.get_all_users() to authenticated;

revoke all on function public.is_admin_user() from public;
revoke all on function public.is_admin_user() from anon;
grant execute on function public.is_admin_user() to authenticated;

revoke all on function public.profile_xp_rank(uuid) from public;
revoke all on function public.profile_xp_rank(uuid) from anon;
grant execute on function public.profile_xp_rank(uuid) to authenticated;

revoke all on function public.record_daily_streak() from public;
revoke all on function public.record_daily_streak() from anon;
grant execute on function public.record_daily_streak() to authenticated;

revoke all on function public.showcase_like_counts(uuid[]) from public;
revoke all on function public.showcase_like_counts(uuid[]) from anon;
grant execute on function public.showcase_like_counts(uuid[]) to authenticated;

-- Триггерные функции: не вызывать с клиента
revoke all on function public.handle_new_user() from public;
revoke all on function public.handle_new_user() from anon;
revoke all on function public.handle_new_user() from authenticated;

revoke all on function public.fn_activity_notify_friendship() from public;
revoke all on function public.fn_activity_notify_friendship() from anon;
revoke all on function public.fn_activity_notify_friendship() from authenticated;

revoke all on function public.fn_notify_admins_project_moderation() from public;
revoke all on function public.fn_notify_admins_project_moderation() from anon;
revoke all on function public.fn_notify_admins_project_moderation() from authenticated;

revoke all on function public.fn_notify_author_project_moderation() from public;
revoke all on function public.fn_notify_author_project_moderation() from anon;
revoke all on function public.fn_notify_author_project_moderation() from authenticated;

revoke all on function public.update_updated_at_column() from public;
revoke all on function public.update_updated_at_column() from anon;
revoke all on function public.update_updated_at_column() from authenticated;

-- ---------------------------------------------------------------------------
-- RLS: убрать чтение всех сдач и прогресса любым учеником
-- ---------------------------------------------------------------------------

drop policy if exists "homework_submissions_select_student_peers" on public.homework_submissions;
drop policy if exists "user_progress_select_student_peers" on public.user_progress;

-- ---------------------------------------------------------------------------
-- RLS: profiles — убрать «любой authenticated видит всех» и сузить peer
-- ---------------------------------------------------------------------------

drop policy if exists "Authenticated users can view profiles" on public.profiles;
drop policy if exists "profiles_select_student_peers" on public.profiles;
drop policy if exists "Admins can view all profiles" on public.profiles;

create policy "profiles_select_visible"
  on public.profiles for select
  to authenticated
  using (
    (select auth.uid()) = id
    or public.is_admin_user()
    or exists (
      select 1
      from public.profiles viewer
      where viewer.id = (select auth.uid())
        and lower(trim(coalesce(viewer.role::text, ''))) in ('teacher', 'parent')
        and lower(trim(coalesce(profiles.role::text, ''))) = 'student'
    )
    or exists (
      select 1
      from public.friendships f
      where f.status = 'accepted'
        and (
          (f.requester_id = (select auth.uid()) and f.addressee_id = profiles.id)
          or (f.addressee_id = (select auth.uid()) and f.requester_id = profiles.id)
        )
    )
    or (
      lower(trim(coalesce(profiles.role::text, ''))) = 'student'
      and exists (
        select 1
        from public.profiles viewer
        where viewer.id = (select auth.uid())
          and lower(trim(coalesce(viewer.role::text, ''))) = 'student'
      )
    )
  );

-- ---------------------------------------------------------------------------
-- RLS: лайки — не отдавать всю таблицу
-- ---------------------------------------------------------------------------

drop policy if exists "project_likes_select_all" on public.project_post_likes;

create policy "project_likes_select_own_or_author_or_admin"
  on public.project_post_likes for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or exists (
      select 1
      from public.project_posts po
      where po.id = post_id
        and po.author_id = (select auth.uid())
    )
    or exists (
      select 1
      from public.profiles p
      where p.id = (select auth.uid())
        and lower(trim(coalesce(p.role::text, ''))) = 'admin'
    )
  );

-- ---------------------------------------------------------------------------
-- Индексы под FK (совет performance advisor)
-- ---------------------------------------------------------------------------

create index if not exists activity_notifications_actor_id_idx
  on public.activity_notifications (actor_id);

create index if not exists project_posts_moderator_id_idx
  on public.project_posts (moderator_id);

-- ---------------------------------------------------------------------------
-- friendships: (select auth.uid()) в политиках — меньше пересчётов (initplan)
-- ---------------------------------------------------------------------------

drop policy if exists "friendships_select_own" on public.friendships;
create policy "friendships_select_own"
  on public.friendships for select
  to authenticated
  using ((select auth.uid()) = requester_id or (select auth.uid()) = addressee_id);

drop policy if exists "friendships_insert_as_requester" on public.friendships;
create policy "friendships_insert_as_requester"
  on public.friendships for insert
  to authenticated
  with check ((select auth.uid()) = requester_id);

drop policy if exists "friendships_update_parties" on public.friendships;
create policy "friendships_update_parties"
  on public.friendships for update
  to authenticated
  using ((select auth.uid()) = requester_id or (select auth.uid()) = addressee_id)
  with check ((select auth.uid()) = requester_id or (select auth.uid()) = addressee_id);

drop policy if exists "friendships_delete_parties" on public.friendships;
create policy "friendships_delete_parties"
  on public.friendships for delete
  to authenticated
  using ((select auth.uid()) = requester_id or (select auth.uid()) = addressee_id);

commit;
