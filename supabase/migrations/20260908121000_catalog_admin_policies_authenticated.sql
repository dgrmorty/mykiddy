-- "Admins can manage *" was FOR ALL to PUBLIC, so anon evaluated is_admin_user()
-- without EXECUTE and got 42501 instead of an empty catalog.

begin;

drop policy if exists "Admins can manage courses" on public.courses;
create policy "Admins can manage courses"
  on public.courses for all
  to authenticated
  using (public.is_admin_user())
  with check (public.is_admin_user());

drop policy if exists "Admins can manage modules" on public.modules;
create policy "Admins can manage modules"
  on public.modules for all
  to authenticated
  using (public.is_admin_user())
  with check (public.is_admin_user());

drop policy if exists "Admins can manage lessons" on public.lessons;
create policy "Admins can manage lessons"
  on public.lessons for all
  to authenticated
  using (public.is_admin_user())
  with check (public.is_admin_user());

commit;
