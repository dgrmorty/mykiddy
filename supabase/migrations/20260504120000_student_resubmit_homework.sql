-- Ученик может отправить ДЗ повторно после отклонения админом (обновление своей строки).

begin;

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
