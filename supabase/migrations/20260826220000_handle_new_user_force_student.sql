-- Force new profiles to Student. Signup metadata must not choose Admin/Teacher.
-- Existing admin rows are not changed.

begin;

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
    'Student',
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

comment on function public.handle_new_user() is
  'Creates a Student profile for every new auth user. Role is never taken from user metadata.';

commit;
