-- Файлы ученика в хранилище — для удаления аккаунта при отзыве согласия на обработку персональных данных.
-- Только загрузки самого пользователя (аватары, фото домашек, медиа проектов); файлы школы не трогаем.
-- Вызывает только сервер (service_role).

begin;

create or replace function public.user_storage_paths(p_user_id uuid)
returns table (bucket_id text, name text)
language sql
stable
security definer
set search_path = ''
as $$
  select o.bucket_id, o.name
  from storage.objects o
  where o.owner = p_user_id
    and o.bucket_id in ('images', 'project_showcase');
$$;

revoke all on function public.user_storage_paths(uuid) from public;
revoke all on function public.user_storage_paths(uuid) from anon;
revoke all on function public.user_storage_paths(uuid) from authenticated;
grant execute on function public.user_storage_paths(uuid) to service_role;

commit;
