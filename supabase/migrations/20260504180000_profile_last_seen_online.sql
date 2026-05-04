-- Онлайн-статус: last_seen_at + пульс с клиента; каталог учеников отдаёт метку времени.

begin;

alter table public.profiles add column if not exists last_seen_at timestamptz;

create or replace function public.touch_profile_last_seen()
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  uid uuid := (select auth.uid());
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;
  update public.profiles
  set last_seen_at = now()
  where id = uid;
end;
$function$;

revoke all on function public.touch_profile_last_seen() from public;
revoke all on function public.touch_profile_last_seen() from anon;
grant execute on function public.touch_profile_last_seen() to authenticated;

create or replace function public.list_community_students()
returns table (
  id uuid,
  name text,
  avatar text,
  xp integer,
  level integer,
  role text,
  last_seen_at timestamptz
)
language sql
stable
security definer
set search_path to 'public'
as $$
  select p.id, p.name, p.avatar, p.xp, p.level, p.role::text, p.last_seen_at
  from public.profiles p
  where lower(trim(coalesce(p.role::text, ''))) = 'student'
  order by p.name asc nulls last;
$$;

revoke all on function public.list_community_students() from public;
revoke all on function public.list_community_students() from anon;
grant execute on function public.list_community_students() to authenticated;

commit;
