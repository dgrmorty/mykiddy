-- Гость в SPA без входа в Supabase = роль anon. Ранее SELECT был только для authenticated,
-- из-за этого каталог курсов и вложенные modules/lessons недоступны анонимам.
-- Расписание на дашборде (schedule_events) — то же ограничение.

begin;

drop policy if exists "Authenticated users can view courses" on public.courses;
drop policy if exists "Authenticated users can view modules" on public.modules;
drop policy if exists "Authenticated users can view lessons" on public.lessons;

create policy "Public can view courses"
  on public.courses for select
  using (true);

create policy "Public can view modules"
  on public.modules for select
  using (true);

create policy "Public can view lessons"
  on public.lessons for select
  using (true);

drop policy if exists "Authenticated can read schedule_events" on public.schedule_events;

create policy "Public can read schedule_events"
  on public.schedule_events for select
  using (true);

commit;
