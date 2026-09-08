-- Student library access is assigned by level (junior/middle/senior/senior_plus).
-- Catalog SELECT is no longer public; students only see courses of their assigned tier.

begin;

alter table public.profiles
  add column if not exists course_level_tier text default 'senior_plus';

-- Product decision: existing accounts start on Senior+ until an admin reassigns.
update public.profiles
set course_level_tier = 'senior_plus';

alter table public.profiles
  alter column course_level_tier set default 'senior_plus';

alter table public.profiles
  alter column course_level_tier set not null;

alter table public.profiles drop constraint if exists profiles_course_level_tier_check;
alter table public.profiles add constraint profiles_course_level_tier_check
  check (course_level_tier in ('junior', 'middle', 'senior', 'senior_plus'));

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
  insert into public.profiles (id, email, name, role, avatar, course_level_tier)
  values (
    new.id,
    new.email,
    user_name,
    'Student',
    coalesce(
      new.raw_user_meta_data->>'avatar',
      'https://ui-avatars.com/api/?name=' || avatar_letter || '&background=random'
    ),
    'senior_plus'
  )
  on conflict (id) do nothing;
  return new;
exception
  when others then
    raise warning 'handle_new_user error for %: %', new.id, sqlerrm;
    return new;
end;
$function$;

comment on function public.handle_new_user() is
  'Creates a Student profile for every new auth user. Role is never taken from user metadata. Course level defaults to senior_plus.';

create or replace function public.viewer_course_level_tier()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select p.course_level_tier
  from public.profiles p
  where p.id = (select auth.uid())
$$;

comment on function public.viewer_course_level_tier() is
  'Assigned course level of the current auth user. Used by catalog RLS. Students cannot set this.';

revoke all on function public.viewer_course_level_tier() from public;
revoke all on function public.viewer_course_level_tier() from anon;
grant execute on function public.viewer_course_level_tier() to authenticated;

create or replace function public.admin_set_course_level_tier(p_user_id uuid, p_tier text)
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
  if p_tier is null or p_tier not in ('junior', 'middle', 'senior', 'senior_plus') then
    raise exception 'invalid tier';
  end if;
  update public.profiles
  set course_level_tier = p_tier, updated_at = now()
  where id = p_user_id;
  if not found then
    raise exception 'profile not found';
  end if;
end;
$function$;

revoke all on function public.admin_set_course_level_tier(uuid, text) from public;
revoke all on function public.admin_set_course_level_tier(uuid, text) from anon;
grant execute on function public.admin_set_course_level_tier(uuid, text) to authenticated;

-- Students can UPDATE their own profile row; do not let them rewrite assigned level.
create or replace function public.protect_course_level_tier()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
begin
  if new.course_level_tier is distinct from old.course_level_tier
     and not public.is_admin_user() then
    raise exception 'forbidden';
  end if;
  return new;
end;
$function$;

drop trigger if exists trg_protect_course_level_tier on public.profiles;
create trigger trg_protect_course_level_tier
  before update of course_level_tier on public.profiles
  for each row
  execute function public.protect_course_level_tier();

revoke all on function public.protect_course_level_tier() from public;
revoke all on function public.protect_course_level_tier() from anon;
revoke all on function public.protect_course_level_tier() from authenticated;

revoke update (course_level_tier) on table public.profiles from authenticated;
revoke update (course_level_tier) on table public.profiles from anon;

drop function if exists public.get_all_users();

create function public.get_all_users()
returns table(
  id uuid,
  email text,
  name text,
  role text,
  avatar text,
  level integer,
  xp integer,
  is_approved boolean,
  created_at timestamp with time zone,
  course_level_tier text
)
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if not public.is_admin_user() then
    raise exception 'Access denied. Admin only.';
  end if;

  return query
  select
    au.id,
    coalesce(p.email, au.email)::text as email,
    coalesce(p.name, au.raw_user_meta_data->>'name', split_part(au.email, '@', 1))::text as name,
    coalesce(p.role, 'Student')::text as role,
    coalesce(
      p.avatar,
      au.raw_user_meta_data->>'avatar',
      'https://ui-avatars.com/api/?name=' || coalesce(left(trim(coalesce(p.name, split_part(au.email, '@', 1))), 1), 'U') || '&background=random'
    )::text as avatar,
    coalesce(p.level, 1)::integer as level,
    coalesce(p.xp, 0)::integer as xp,
    coalesce(p.is_approved, false)::boolean as is_approved,
    coalesce(p.created_at, au.created_at) as created_at,
    coalesce(p.course_level_tier, 'senior_plus')::text as course_level_tier
  from auth.users au
  left join public.profiles p on au.id = p.id
  order by coalesce(p.created_at, au.created_at) desc nulls last;
end;
$function$;

revoke all on function public.get_all_users() from public;
revoke all on function public.get_all_users() from anon;
grant execute on function public.get_all_users() to authenticated;

drop policy if exists "Public can view courses" on public.courses;
drop policy if exists "Authenticated users can view courses" on public.courses;
drop policy if exists "courses_select_by_level" on public.courses;

create policy "courses_select_by_level"
  on public.courses for select
  to authenticated
  using (
    public.is_admin_user()
    or level_tier = public.viewer_course_level_tier()
  );

drop policy if exists "Public can view modules" on public.modules;
drop policy if exists "Authenticated users can view modules" on public.modules;
drop policy if exists "modules_select_by_course_level" on public.modules;

create policy "modules_select_by_course_level"
  on public.modules for select
  to authenticated
  using (
    public.is_admin_user()
    or exists (
      select 1
      from public.courses c
      where c.id = modules.course_id
        and c.level_tier = public.viewer_course_level_tier()
    )
  );

drop policy if exists "Public can view lessons" on public.lessons;
drop policy if exists "Authenticated users can view lessons" on public.lessons;
drop policy if exists "lessons_select_by_course_level" on public.lessons;

create policy "lessons_select_by_course_level"
  on public.lessons for select
  to authenticated
  using (
    public.is_admin_user()
    or exists (
      select 1
      from public.modules m
      join public.courses c on c.id = m.course_id
      where m.id = lessons.module_id
        and c.level_tier = public.viewer_course_level_tier()
    )
  );

commit;
