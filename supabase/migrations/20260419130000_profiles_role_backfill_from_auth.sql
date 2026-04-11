-- Пустой profiles.role ломает RLS «ученик видит учеников»: exists(...) требует lower(role)='student'.
-- Клиент при этом считает роль Student по умолчанию (AuthContext). Подтягиваем роль из auth metadata.
-- Дополнительно RLS: пустая роль зрителя трактуется как ученик (как в приложении).

begin;

update public.profiles p
set role = (
  case lower(coalesce(nullif(trim(u.raw_user_meta_data->>'role'), ''), ''))
    when 'admin' then 'Admin'
    when 'teacher' then 'Teacher'
    when 'parent' then 'Parent'
    else 'Student'
  end
)
from auth.users u
where p.id = u.id
  and (
    p.role is null
    or btrim(p.role::text) = ''
  );

drop policy if exists "profiles_select_visible" on public.profiles;

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
          and (
            lower(trim(coalesce(viewer.role::text, ''))) = 'student'
            or nullif(btrim(coalesce(viewer.role::text, '')), '') is null
          )
      )
    )
  );

drop policy if exists "user_progress_select_student_peers" on public.user_progress;

create policy "user_progress_select_student_peers"
  on public.user_progress for select
  to authenticated
  using (
    exists (
      select 1
      from public.profiles owner
      where owner.id = user_progress.user_id
        and lower(trim(coalesce(owner.role::text, ''))) = 'student'
    )
    and exists (
      select 1
      from public.profiles viewer
      where viewer.id = (select auth.uid())
        and (
          lower(trim(coalesce(viewer.role::text, ''))) = 'student'
          or nullif(btrim(coalesce(viewer.role::text, '')), '') is null
        )
    )
  );

commit;
