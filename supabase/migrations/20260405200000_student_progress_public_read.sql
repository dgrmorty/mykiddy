-- Чтение прогресса и сдач ДЗ для профилей учеников (каталог /users/:id).
-- Своё поведение не ломаем: политики суммируются через OR.

begin;

drop policy if exists "user_progress_select_student_peers" on public.user_progress;
create policy "user_progress_select_student_peers"
  on public.user_progress for select
  to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = user_progress.user_id
        and lower(trim(coalesce(p.role::text, ''))) = 'student'
    )
  );

drop policy if exists "homework_submissions_select_student_peers" on public.homework_submissions;
create policy "homework_submissions_select_student_peers"
  on public.homework_submissions for select
  to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = homework_submissions.user_id
        and lower(trim(coalesce(p.role::text, ''))) = 'student'
    )
  );

commit;
