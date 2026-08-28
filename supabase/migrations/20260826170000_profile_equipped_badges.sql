-- Public profile medals: up to three owner-selected badge IDs.
-- Writes go through SECURITY DEFINER RPC (profiles has no UPDATE policy).

begin;

alter table public.profiles
  add column if not exists equipped_badges text[] not null default '{}';

comment on column public.profiles.equipped_badges is
  'Owner-selected public badge IDs (max 3). Written only via update_own_equipped_badges.';

create or replace function public.update_own_equipped_badges(p_badge_ids text[])
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  uid uuid := (select auth.uid());
  v_ids text[] := coalesce(p_badge_ids, '{}');
  v_id text;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  if cardinality(v_ids) > 3 then
    raise exception 'too many badges';
  end if;

  if exists (
    select 1
    from unnest(v_ids) as t(badge_id)
    group by t.badge_id
    having count(*) > 1
  ) then
    raise exception 'duplicate badge ids';
  end if;

  foreach v_id in array v_ids
  loop
    if v_id is null or v_id !~ '^[a-z0-9_-]{1,64}$' then
      raise exception 'invalid badge id';
    end if;
  end loop;

  update public.profiles
  set
    equipped_badges = v_ids,
    updated_at = now()
  where id = uid;

  if not found then
    raise exception 'profile not found';
  end if;
end;
$function$;

comment on function public.update_own_equipped_badges(text[]) is
  'Authenticated caller may set own profiles.equipped_badges (max 3 unique catalog-safe ids).';

revoke all on function public.update_own_equipped_badges(text[]) from public;
revoke all on function public.update_own_equipped_badges(text[]) from anon;
grant execute on function public.update_own_equipped_badges(text[]) to authenticated;

commit;
