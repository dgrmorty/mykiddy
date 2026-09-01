-- Weekly schedule groups for academic year 2026/27 (admin-managed, public read).

create table if not exists public.schedule_config (
  id int primary key default 1 check (id = 1),
  academic_year_start date not null,
  academic_year_end date not null
);

insert into public.schedule_config (id, academic_year_start, academic_year_end)
values (1, '2026-09-01', '2027-05-27')
on conflict (id) do update set
  academic_year_start = excluded.academic_year_start,
  academic_year_end = excluded.academic_year_end;

create table if not exists public.schedule_groups (
  id uuid primary key default gen_random_uuid(),
  day_of_week int not null check (day_of_week between 1 and 7),
  time_start text not null,
  time_end text not null,
  title text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

comment on table public.schedule_groups is
  'Recurring weekly class groups shown in schedule until academic_year_end.';
comment on column public.schedule_groups.day_of_week is '1=Mon … 7=Sun';

alter table public.schedule_groups enable row level security;

drop policy if exists "Public can read schedule_groups" on public.schedule_groups;
create policy "Public can read schedule_groups"
  on public.schedule_groups for select
  using (true);

drop policy if exists "Admin insert schedule_groups" on public.schedule_groups;
create policy "Admin insert schedule_groups"
  on public.schedule_groups for insert
  to authenticated
  with check (public.is_admin_user());

drop policy if exists "Admin update schedule_groups" on public.schedule_groups;
create policy "Admin update schedule_groups"
  on public.schedule_groups for update
  to authenticated
  using (public.is_admin_user())
  with check (public.is_admin_user());

drop policy if exists "Admin delete schedule_groups" on public.schedule_groups;
create policy "Admin delete schedule_groups"
  on public.schedule_groups for delete
  to authenticated
  using (public.is_admin_user());

alter table public.schedule_config enable row level security;

drop policy if exists "Public can read schedule_config" on public.schedule_config;
create policy "Public can read schedule_config"
  on public.schedule_config for select
  using (true);

drop policy if exists "Admin update schedule_config" on public.schedule_config;
create policy "Admin update schedule_config"
  on public.schedule_config for update
  to authenticated
  using (public.is_admin_user())
  with check (public.is_admin_user());

-- Replace legacy hardcoded groups with 2026/27 timetable.
delete from public.schedule_groups;

insert into public.schedule_groups (day_of_week, time_start, time_end, title, sort_order) values
  (1, '20:00', '21:30', 'Senior+', 1),
  (2, '14:30', '16:00', 'Junior', 1),
  (2, '16:20', '17:50', 'Middle', 2),
  (3, '18:00', '19:30', 'Senior', 1),
  (5, '18:20', '19:50', 'Senior+', 1),
  (6, '10:00', '11:30', 'Junior', 1),
  (6, '11:40', '13:10', 'Senior', 2),
  (6, '13:20', '14:50', 'Senior', 3),
  (6, '15:00', '16:30', 'Middle', 4),
  (7, '10:00', '11:30', 'Отработка', 1),
  (7, '11:40', '13:10', 'Junior', 2),
  (7, '13:20', '14:50', 'Senior', 3),
  (7, '15:00', '16:30', 'Senior', 4);
