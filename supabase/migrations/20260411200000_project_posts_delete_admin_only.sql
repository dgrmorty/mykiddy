-- Удалять посты витрины могут только администраторы (не авторы).

begin;

drop policy if exists "project_posts_delete_own" on public.project_posts;

commit;
