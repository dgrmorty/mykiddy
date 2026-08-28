-- Hide profiles.email from other users. Own row + admins keep full SELECT.
-- Directory/leaderboard/public profile go through SECURITY DEFINER RPCs without email.

begin;

drop policy if exists "profiles_select_visible" on public.profiles;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  to authenticated
  using (id = (select auth.uid()));

drop policy if exists "profiles_select_admin" on public.profiles;
create policy "profiles_select_admin"
  on public.profiles for select
  to authenticated
  using (public.is_admin_user());

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
  order by p.xp desc nulls last
  limit greatest(1, least(coalesce(p_limit, 50), 100));
$$;

create or replace function public.get_public_student_profile(p_id uuid)
returns table (
  id uuid,
  name text,
  avatar text,
  xp integer,
  level integer,
  role text,
  equipped_badges text[]
)
language sql
stable
security definer
set search_path to 'public'
as $$
  select p.id, p.name, p.avatar, p.xp, p.level, p.role::text, coalesce(p.equipped_badges, '{}'::text[])
  from public.profiles p
  where p.id = p_id
    and lower(trim(coalesce(p.role::text, ''))) = 'student'
  limit 1;
$$;

revoke all on function public.list_leaderboard(integer) from public;
revoke all on function public.list_leaderboard(integer) from anon;
grant execute on function public.list_leaderboard(integer) to authenticated;

revoke all on function public.get_public_student_profile(uuid) from public;
revoke all on function public.get_public_student_profile(uuid) from anon;
grant execute on function public.get_public_student_profile(uuid) to authenticated;

comment on function public.list_leaderboard(integer) is
  'Authenticated leaderboard without emails or other PII.';
comment on function public.get_public_student_profile(uuid) is
  'Public student profile card without email.';

commit;
