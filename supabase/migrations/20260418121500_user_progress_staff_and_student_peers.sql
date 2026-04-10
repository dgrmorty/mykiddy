-- После отзыва peer-чтения: снова разрешить чтение прогресса (только lesson_id),
-- иначе публичный профиль ученика и радар по чужим курсам пустые.
-- Чужие тексты ДЗ по-прежнему недоступны (политика homework_submissions не восстанавливается).

begin;

-- Наставники / родители / админ — прогресс учеников
create policy "user_progress_select_staff_student"
  on public.user_progress for select
  to authenticated
  using (
    exists (
      select 1
      from public.profiles viewer
      where viewer.id = (select auth.uid())
        and lower(trim(coalesce(viewer.role::text, ''))) in ('teacher', 'parent', 'admin')
    )
    and exists (
      select 1
      from public.profiles owner
      where owner.id = user_progress.user_id
        and lower(trim(coalesce(owner.role::text, ''))) = 'student'
    )
  );

-- Принятая дружба — видеть прогресс друга
create policy "user_progress_select_friend_accepted"
  on public.user_progress for select
  to authenticated
  using (
    exists (
      select 1
      from public.friendships f
      where f.status = 'accepted'
        and (
          (f.requester_id = (select auth.uid()) and f.addressee_id = user_progress.user_id)
          or (f.addressee_id = (select auth.uid()) and f.requester_id = user_progress.user_id)
        )
    )
  );

-- Два ученика: видно только список пройденных уроков (без текста ДЗ)
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
        and lower(trim(coalesce(viewer.role::text, ''))) = 'student'
    )
  );

commit;
