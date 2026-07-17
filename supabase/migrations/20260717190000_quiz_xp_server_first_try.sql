-- First-try XP: server decides from miss records (client boolean is not trusted).

create table if not exists public.lesson_quiz_misses (
  user_id uuid not null references auth.users (id) on delete cascade,
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  cue_id text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, lesson_id, cue_id)
);

create index if not exists lesson_quiz_misses_lesson_idx
  on public.lesson_quiz_misses (lesson_id);

alter table public.lesson_quiz_misses enable row level security;

drop policy if exists "Users read own quiz misses" on public.lesson_quiz_misses;
create policy "Users read own quiz misses"
  on public.lesson_quiz_misses for select
  to authenticated
  using (user_id = (select auth.uid()));

comment on table public.lesson_quiz_misses is
  'Wrong answers before a correct claim; blocks +1 XP for that cue.';

create or replace function public.record_lesson_quiz_miss(
  p_lesson_id uuid,
  p_cue_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := (select auth.uid());
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;
  if p_lesson_id is null or p_cue_id is null or length(trim(p_cue_id)) = 0 then
    raise exception 'Invalid quiz cue';
  end if;

  -- Уже сдан правильно — промах не пишем
  if exists (
    select 1 from public.lesson_quiz_completions c
    where c.user_id = uid and c.lesson_id = p_lesson_id and c.cue_id = trim(p_cue_id)
  ) then
    return jsonb_build_object('ok', true, 'ignored', true);
  end if;

  insert into public.lesson_quiz_misses (user_id, lesson_id, cue_id)
  values (uid, p_lesson_id, trim(p_cue_id))
  on conflict (user_id, lesson_id, cue_id) do nothing;

  return jsonb_build_object('ok', true, 'ignored', false);
end;
$$;

revoke all on function public.record_lesson_quiz_miss(uuid, text) from public;
revoke all on function public.record_lesson_quiz_miss(uuid, text) from anon;
grant execute on function public.record_lesson_quiz_miss(uuid, text) to authenticated;

-- Claim: +1 XP only if no miss row exists for this cue (true first try).
create or replace function public.claim_lesson_quiz_cue(
  p_lesson_id uuid,
  p_cue_id text,
  p_first_try boolean default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := (select auth.uid());
  new_cue text;
  had_miss boolean := false;
  award int := 0;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;
  if p_lesson_id is null or p_cue_id is null or length(trim(p_cue_id)) = 0 then
    raise exception 'Invalid quiz cue';
  end if;

  select exists (
    select 1 from public.lesson_quiz_misses m
    where m.user_id = uid and m.lesson_id = p_lesson_id and m.cue_id = trim(p_cue_id)
  ) into had_miss;

  insert into public.lesson_quiz_completions (user_id, lesson_id, cue_id, first_try, xp_awarded)
  values (uid, p_lesson_id, trim(p_cue_id), not had_miss, 0)
  on conflict (user_id, lesson_id, cue_id) do nothing
  returning cue_id into new_cue;

  if new_cue is null then
    return jsonb_build_object(
      'ok', true,
      'already', true,
      'awarded', false,
      'xp', 0,
      'first_try', false
    );
  end if;

  if not had_miss then
    award := 1;
    update public.lesson_quiz_completions
    set xp_awarded = 1, first_try = true
    where user_id = uid and lesson_id = p_lesson_id and cue_id = trim(p_cue_id);

    update public.profiles
    set
      xp = coalesce(xp, 0) + 1,
      level = (greatest(coalesce(xp, 0) + 1, 0) / 500) + 1
    where id = uid;
  else
    update public.lesson_quiz_completions
    set xp_awarded = 0, first_try = false
    where user_id = uid and lesson_id = p_lesson_id and cue_id = trim(p_cue_id);
  end if;

  return jsonb_build_object(
    'ok', true,
    'already', false,
    'awarded', award > 0,
    'xp', award,
    'first_try', not had_miss
  );
end;
$$;

revoke all on function public.claim_lesson_quiz_cue(uuid, text, boolean) from public;
revoke all on function public.claim_lesson_quiz_cue(uuid, text, boolean) from anon;
grant execute on function public.claim_lesson_quiz_cue(uuid, text, boolean) to authenticated;
