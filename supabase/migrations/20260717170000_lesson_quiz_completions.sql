-- Persist answered in-video quiz cues; award +1 XP only on first-try correct.
create table if not exists public.lesson_quiz_completions (
  user_id uuid not null references auth.users (id) on delete cascade,
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  cue_id text not null,
  first_try boolean not null default false,
  xp_awarded integer not null default 0,
  created_at timestamptz not null default now(),
  primary key (user_id, lesson_id, cue_id)
);

create index if not exists lesson_quiz_completions_lesson_idx
  on public.lesson_quiz_completions (lesson_id);

alter table public.lesson_quiz_completions enable row level security;

drop policy if exists "Users read own quiz completions" on public.lesson_quiz_completions;
create policy "Users read own quiz completions"
  on public.lesson_quiz_completions for select
  to authenticated
  using (user_id = (select auth.uid()));

-- Inserts only via SECURITY DEFINER RPC
drop policy if exists "Users insert own quiz completions" on public.lesson_quiz_completions;

comment on table public.lesson_quiz_completions is
  'Answered lesson quiz cues; XP only when first_try and xp_awarded=1.';

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

  if coalesce(p_first_try, false) then
    award := 1;
    update public.lesson_quiz_completions
    set xp_awarded = 1, first_try = true
    where user_id = uid and lesson_id = p_lesson_id and cue_id = trim(p_cue_id);

    update public.profiles
    set
      xp = coalesce(xp, 0) + 1,
      level = (greatest(coalesce(xp, 0) + 1, 0) / 500) + 1
    where id = uid;
  end if;

  return jsonb_build_object(
    'ok', true,
    'already', false,
    'awarded', award > 0,
    'xp', award
  );
end;
$$;

revoke all on function public.claim_lesson_quiz_cue(uuid, text, boolean) from public;
revoke all on function public.claim_lesson_quiz_cue(uuid, text, boolean) from anon;
grant execute on function public.claim_lesson_quiz_cue(uuid, text, boolean) to authenticated;
