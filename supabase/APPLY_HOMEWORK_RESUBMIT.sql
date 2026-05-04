-- Выполни целиком в Supabase: SQL Editor → New query → Run
-- Нужно для повторной сдачи ДЗ после отклонения админом (без этого — ошибка в приложении).

begin;

-- 1) RLS: ученик обновляет только свою строку со статусом rejected → pending
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

-- 2) RPC (запасной путь в приложении, если UPDATE по какой-то причине не сработает)
create or replace function public.student_resubmit_homework(
  p_submission_id uuid,
  p_answer text,
  p_attachments jsonb
)
returns json
language plpgsql
security definer
set search_path = public
as $function$
declare
  s record;
begin
  if (select auth.uid()) is null then
    raise exception 'Not authenticated';
  end if;

  select * into s
  from public.homework_submissions
  where id = p_submission_id
  for update;

  if not found then
    raise exception 'Submission not found';
  end if;

  if s.user_id <> (select auth.uid()) then
    raise exception 'Forbidden';
  end if;

  if s.status is distinct from 'rejected' then
    raise exception 'Can only resubmit rejected homework';
  end if;

  update public.homework_submissions
  set
    status = 'pending',
    answer = nullif(trim(coalesce(p_answer, '')), ''),
    attachments = case
      when p_attachments is null then null
      when jsonb_typeof(p_attachments) = 'array' and jsonb_array_length(p_attachments) = 0 then null
      else p_attachments
    end,
    admin_comment = null,
    reviewed_by = null,
    reviewed_at = null,
    submitted_at = now(),
    xp_awarded = 0
  where id = p_submission_id;

  return json_build_object('ok', true, 'status', 'pending');
end;
$function$;

revoke all on function public.student_resubmit_homework(uuid, text, jsonb) from public;
revoke all on function public.student_resubmit_homework(uuid, text, jsonb) from anon;
grant execute on function public.student_resubmit_homework(uuid, text, jsonb) to authenticated;

commit;
