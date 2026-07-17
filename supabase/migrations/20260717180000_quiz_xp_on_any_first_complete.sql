-- Award +1 XP on first successful completion of a cue, even if earlier attempts
-- in the same session were wrong (wrong answers do not insert a row).
-- Also backfill users who completed cues with xp_awarded=0.

create or replace function public.claim_lesson_quiz_cue(
  p_lesson_id uuid,
  p_cue_id text,
  p_first_try boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := (select auth.uid());
  new_cue text;
  award int := 0;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;
  if p_lesson_id is null or p_cue_id is null or length(trim(p_cue_id)) = 0 then
    raise exception 'Invalid quiz cue';
  end if;

  insert into public.lesson_quiz_completions (user_id, lesson_id, cue_id, first_try, xp_awarded)
  values (uid, p_lesson_id, trim(p_cue_id), coalesce(p_first_try, false), 0)
  on conflict (user_id, lesson_id, cue_id) do nothing
  returning cue_id into new_cue;

  if new_cue is null then
    return jsonb_build_object(
      'ok', true,
      'already', true,
      'awarded', false,
      'xp', 0
    );
  end if;

  -- Первый успешный ответ на этот cue всегда даёт +1 XP.
  -- p_first_try только для аналитики (ошибся ли до правильного ответа).
  award := 1;
  update public.lesson_quiz_completions
  set xp_awarded = 1, first_try = coalesce(p_first_try, false)
  where user_id = uid and lesson_id = p_lesson_id and cue_id = trim(p_cue_id);

  update public.profiles
  set
    xp = coalesce(xp, 0) + 1,
    level = (greatest(coalesce(xp, 0) + 1, 0) / 500) + 1
  where id = uid;

  return jsonb_build_object(
    'ok', true,
    'already', false,
    'awarded', true,
    'xp', award
  );
end;
$$;

revoke all on function public.claim_lesson_quiz_cue(uuid, text, boolean) from public;
revoke all on function public.claim_lesson_quiz_cue(uuid, text, boolean) from anon;
grant execute on function public.claim_lesson_quiz_cue(uuid, text, boolean) to authenticated;

-- Доначислить XP тем, у кого cue уже закрыт без награды
with unpaid as (
  select user_id, count(*)::int as n
  from public.lesson_quiz_completions
  where xp_awarded = 0
  group by user_id
)
update public.profiles p
set
  xp = coalesce(p.xp, 0) + u.n,
  level = (greatest(coalesce(p.xp, 0) + u.n, 0) / 500) + 1
from unpaid u
where p.id = u.user_id;

update public.lesson_quiz_completions
set xp_awarded = 1
where xp_awarded = 0;
