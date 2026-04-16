-- Временный фикс: максимально простая политика чтения profiles без вложенных SELECT-ов.
-- Любой аутентифицированный пользователь может читать профили (для лидерборда, XP и витрины).
-- Если нужна более жёсткая приватность, позже можно сузить условие.

begin;

drop policy if exists "profiles_select_visible" on public.profiles;

create policy "profiles_select_visible"
  on public.profiles for select
  to authenticated
  using (true);

commit;

