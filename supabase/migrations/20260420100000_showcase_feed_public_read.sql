-- Витрина: гости не видели одобренные посты (RLS только authenticated).
-- Авторы: пакетный SELECT profiles IN (...) конфликтует с profiles_select_visible
-- (аналогично list_community_students). Обход — SECURITY DEFINER RPC.

begin;

drop policy if exists "project_posts_select_approved_anon" on public.project_posts;
create policy "project_posts_select_approved_anon"
  on public.project_posts for select
  to anon
  using (status = 'approved');

create or replace function public.list_showcase_authors(author_ids uuid[])
returns table (
  id uuid,
  name text,
  avatar text,
  xp integer
)
language sql
stable
security definer
set search_path to 'public'
as $$
  select distinct p.id, p.name, p.avatar, p.xp
  from public.profiles p
  where p.id = any(author_ids)
    and exists (
      select 1
      from public.project_posts po
      where po.author_id = p.id
        and po.status = 'approved'
    );
$$;

revoke all on function public.list_showcase_authors(uuid[]) from public;
grant execute on function public.list_showcase_authors(uuid[]) to authenticated;
grant execute on function public.list_showcase_authors(uuid[]) to anon;

grant execute on function public.showcase_like_counts(uuid[]) to anon;

commit;
