-- Стрик: в ветке «уже заходили сегодня» не отдавать 0 при аномальных данных.
-- Витрина: RPC чтения одобренных постов (обход PostgREST/RLS при сбоях клиента).

begin;

create or replace function public.record_daily_streak()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  uid uuid := (select auth.uid());
  today date := (timezone('utc', now()))::date;
  last_d date;
  cur int;
  lng int;
  new_cur int;
begin
  if uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  select streak_last_activity_date, streak_current, streak_longest
  into last_d, cur, lng
  from public.profiles
  where id = uid;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'no_profile');
  end if;

  if last_d is null then
    new_cur := greatest(1, coalesce(cur, 0));
  elsif last_d = today then
    return jsonb_build_object(
      'ok', true,
      'streak_current', greatest(1, coalesce(cur, 0)),
      'streak_longest', greatest(coalesce(lng, 0), greatest(1, coalesce(cur, 0))),
      'unchanged', true
    );
  elsif last_d = today - 1 then
    new_cur := coalesce(cur, 0) + 1;
  else
    new_cur := 1;
  end if;

  update public.profiles
  set
    streak_current = new_cur,
    streak_longest = greatest(coalesce(lng, 0), new_cur),
    streak_last_activity_date = today
  where id = uid;

  return jsonb_build_object(
    'ok', true,
    'streak_current', new_cur,
    'streak_longest', greatest(coalesce(lng, 0), new_cur)
  );
end;
$function$;

revoke all on function public.record_daily_streak() from public;
revoke all on function public.record_daily_streak() from anon;
grant execute on function public.record_daily_streak() to authenticated;

-- Публичная лента одобренных постов (только approved, лимит с cap).
create or replace function public.list_approved_showcase_posts(p_limit int default 50)
returns table (
  id uuid,
  author_id uuid,
  status text,
  phrase_selections jsonb,
  media jsonb,
  reject_reason text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path to 'public'
as $$
  select
    p.id,
    p.author_id,
    p.status,
    p.phrase_selections,
    p.media,
    p.reject_reason,
    p.created_at
  from public.project_posts p
  where p.status = 'approved'
  order by p.created_at desc
  limit greatest(1, least(coalesce(nullif(p_limit, 0), 50), 100));
$$;

revoke all on function public.list_approved_showcase_posts(integer) from public;
grant execute on function public.list_approved_showcase_posts(integer) to authenticated;
grant execute on function public.list_approved_showcase_posts(integer) to anon;

commit;
