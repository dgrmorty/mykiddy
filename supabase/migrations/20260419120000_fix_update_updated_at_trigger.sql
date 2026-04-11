-- Триггер updated_at: SECURITY DEFINER, чтобы обновление проходило при RLS на profiles.

begin;

create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  new.updated_at := now();
  return new;
end;
$function$;

commit;
