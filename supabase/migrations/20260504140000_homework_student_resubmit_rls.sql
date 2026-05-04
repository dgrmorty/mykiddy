-- Ученик может обновить свою отклонённую сдачу (повтор без RPC), если политика RPC ещё не накатывалась.

begin;

drop policy if exists "Users can update own rejected homework for resubmit" on public.homework_submissions;

create policy "Users can update own rejected homework for resubmit"
  on public.homework_submissions
  for update
  to authenticated
  using (
    user_id = (select auth.uid())
    and status = 'rejected'
  )
  with check (
    user_id = (select auth.uid())
    and status = 'pending'
    and coalesce(xp_awarded, 0) = 0
    and reviewed_by is null
    and reviewed_at is null
    and admin_comment is null
  );

commit;
