-- Если streak_last_activity_date ещё NULL (миграция / старые строки), не сбрасывать streak_current в 1.

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
      'streak_current', coalesce(cur, 0),
      'streak_longest', coalesce(lng, 0),
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

commit;
