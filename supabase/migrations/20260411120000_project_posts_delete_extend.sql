-- Автор может удалять свои посты витрины в любом статусе; админ — любые посты.

begin;

drop policy if exists "project_posts_delete_own_pending_rejected" on public.project_posts;

create policy "project_posts_delete_own"
  on public.project_posts for delete
  to authenticated
  using (author_id = auth.uid());

create policy "project_posts_delete_admin"
  on public.project_posts for delete
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and lower(trim(coalesce(p.role::text, ''))) = 'admin'
    )
  );

commit;
