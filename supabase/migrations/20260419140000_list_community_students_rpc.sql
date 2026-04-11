-- Каталог учеников для «Сообщества»: обход RLS на массовом SELECT profiles
-- (политика profiles_select_visible с EXISTS по той же таблице даёт сбои/рекурсию).

begin;

create or replace function public.list_community_students()
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
  order by p.name asc nulls last;
$$;

revoke all on function public.list_community_students() from public;
revoke all on function public.list_community_students() from anon;
grant execute on function public.list_community_students() to authenticated;

commit;
