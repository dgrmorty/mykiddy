-- Ручная проверка ДЗ через админку (без удаления кода ИИ).
-- 1) Расширяем homework_submissions: статус, текст ответа, вложения, модерация.
-- 2) RLS: ученик видит/создаёт только свои; админ видит все; апдейт только админ.
-- 3) RPC: admin_review_homework(submission_id, approve, comment) начисляет XP и закрывает урок.

begin;

-- ---------------------------------------------------------------------------
-- 1) Таблица: homework_submissions
-- ---------------------------------------------------------------------------

alter table public.homework_submissions
  add column if not exists status text not null default 'pending',
  add column if not exists answer text,
  add column if not exists attachments jsonb,
  add column if not exists admin_comment text,
  add column if not exists reviewed_by uuid,
  add column if not exists reviewed_at timestamp with time zone;

-- Миграция старых записей: раз раньше они создавались только при успешном начислении XP,
-- считаем их "approved".
update public.homework_submissions
set status = 'approved'
where coalesce(status, '') = '' or status = 'pending'
  and coalesce(xp_awarded, 0) > 0;

create index if not exists homework_submissions_status_idx
  on public.homework_submissions (status, submitted_at desc);

-- ---------------------------------------------------------------------------
-- 2) RLS политики
-- ---------------------------------------------------------------------------

alter table public.homework_submissions enable row level security;

drop policy if exists "homework_submissions_select_student_peers" on public.homework_submissions;
drop policy if exists "Users can view own homework submissions" on public.homework_submissions;
drop policy if exists "Users can insert own homework submissions" on public.homework_submissions;
drop policy if exists "Admins can view all homework submissions" on public.homework_submissions;
drop policy if exists "Admins can update homework submissions" on public.homework_submissions;

create policy "Users can view own homework submissions"
  on public.homework_submissions for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "Users can insert own homework submissions"
  on public.homework_submissions for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy "Admins can view all homework submissions"
  on public.homework_submissions for select
  to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = (select auth.uid())
        and lower(trim(coalesce(p.role::text, ''))) = 'admin'
    )
  );

create policy "Admins can update homework submissions"
  on public.homework_submissions for update
  to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = (select auth.uid())
        and lower(trim(coalesce(p.role::text, ''))) = 'admin'
    )
  )
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = (select auth.uid())
        and lower(trim(coalesce(p.role::text, ''))) = 'admin'
    )
  );

-- ---------------------------------------------------------------------------
-- 3) RPC для модерации и начисления XP
-- ---------------------------------------------------------------------------

create or replace function public.admin_review_homework(
  submission_id uuid,
  approve boolean,
  comment text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $function$
declare
  is_admin boolean;
  s record;
  progress_inserted boolean := false;
  xp_to_award integer := 0;
begin
  if (select auth.uid()) is null then
    raise exception 'Not authenticated';
  end if;

  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and lower(trim(coalesce(p.role::text, ''))) = 'admin'
  ) into is_admin;
  if not is_admin then
    raise exception 'Not admin';
  end if;

  select * into s
  from public.homework_submissions
  where id = submission_id
  for update;

  if not found then
    raise exception 'Submission not found';
  end if;

  if approve then
    -- 1) Закрываем урок (user_progress) и даём 50 XP за урок, если ещё не закрыт
    begin
      insert into public.user_progress (user_id, lesson_id)
      values (s.user_id, s.lesson_id);
      progress_inserted := true;
    exception when unique_violation then
      progress_inserted := false;
    end;

    if progress_inserted then
      xp_to_award := xp_to_award + 50;
    end if;

    -- 2) ДЗ: дополнительные 50 XP всегда при approve
    xp_to_award := xp_to_award + 50;

    update public.profiles
    set
      xp = coalesce(xp, 0) + xp_to_award,
      level = (greatest(coalesce(xp, 0) + xp_to_award, 0) / 500) + 1
    where id = s.user_id;

    update public.homework_submissions
    set
      status = 'approved',
      xp_awarded = 50,
      admin_comment = nullif(trim(coalesce(comment, '')), ''),
      reviewed_by = (select auth.uid()),
      reviewed_at = now()
    where id = submission_id;

    return json_build_object('ok', true, 'status', 'approved', 'xp_awarded', xp_to_award);
  else
    update public.homework_submissions
    set
      status = 'rejected',
      xp_awarded = 0,
      admin_comment = nullif(trim(coalesce(comment, '')), ''),
      reviewed_by = (select auth.uid()),
      reviewed_at = now()
    where id = submission_id;

    return json_build_object('ok', true, 'status', 'rejected');
  end if;
end;
$function$;

revoke all on function public.admin_review_homework(uuid, boolean, text) from public;
revoke all on function public.admin_review_homework(uuid, boolean, text) from anon;
grant execute on function public.admin_review_homework(uuid, boolean, text) to authenticated;

commit;

