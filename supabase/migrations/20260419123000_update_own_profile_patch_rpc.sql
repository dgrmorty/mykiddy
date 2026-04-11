-- Обновление своего имени/аватара через SECURITY DEFINER (обходит RLS на UPDATE/INSERT).

begin;

create or replace function public.update_own_profile_patch(p_name text, p_avatar text)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  uid uuid := (select auth.uid());
  uemail text;
  v_name text := left(trim(coalesce(p_name, '')), 200);
  v_avatar text := left(trim(coalesce(p_avatar, '')), 2000);
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;
  if v_name = '' then
    raise exception 'empty name';
  end if;
  uemail := (select au.email from auth.users au where au.id = uid limit 1);
  insert into public.profiles (
    id, email, name, avatar, role, level, xp, streak_current, streak_longest, avatar_accessory
  )
  values (
    uid,
    uemail,
    v_name,
    nullif(v_avatar, ''),
    'Student',
    1,
    0,
    0,
    0,
    'none'
  )
  on conflict (id) do update set
    name = excluded.name,
    avatar = excluded.avatar,
    updated_at = now();
end;
$function$;

revoke all on function public.update_own_profile_patch(text, text) from public;
revoke all on function public.update_own_profile_patch(text, text) from anon;
grant execute on function public.update_own_profile_patch(text, text) to authenticated;

commit;
