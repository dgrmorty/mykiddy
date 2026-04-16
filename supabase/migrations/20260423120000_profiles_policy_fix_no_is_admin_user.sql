-- Исправление: RLS-политика на profiles больше не вызывает is_admin_user(),
-- чтобы избежать "infinite recursion detected in policy for relation \"profiles\"".
-- Админы видят все профили напрямую по role='admin'.

begin;

drop policy if exists "profiles_select_visible" on public.profiles;

create policy "profiles_select_visible"
  on public.profiles for select
  to authenticated
  using (
    -- свой профиль
    (select auth.uid()) = id
    -- админ видит всех
    or lower(trim(coalesce(role::text, ''))) = 'admin'
    -- учителя и родители видят учеников
    or exists (
      select 1
      from public.profiles viewer
      where viewer.id = (select auth.uid())
        and lower(trim(coalesce(viewer.role::text, ''))) in ('teacher', 'parent')
        and lower(trim(coalesce(profiles.role::text, ''))) = 'student'
    )
    -- друзья видят друг друга
    or exists (
      select 1
      from public.friendships f
      where f.status = 'accepted'
        and (
          (f.requester_id = (select auth.uid()) and f.addressee_id = profiles.id)
          or (f.addressee_id = (select auth.uid()) and f.requester_id = profiles.id)
        )
    )
    -- ученики видят других учеников (peer)
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

commit;

