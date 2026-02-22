-- Лимиты ИИ: учёт запросов к тьютору и проверке ДЗ по дням.
-- Запустите в Supabase SQL Editor.
--
-- На сервере (Railway) задайте переменные:
--   SUPABASE_URL=https://xxx.supabase.co
--   SUPABASE_ANON_KEY=ваш_anon_key
-- Опционально: AI_DAILY_TUTOR_LIMIT=25, AI_DAILY_HOMEWORK_LIMIT=15

-- Таблица: один ряд на пользователя на дату
create table if not exists public.ai_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null default current_date,
  tutor_count int not null default 0,
  homework_count int not null default 0,
  primary key (user_id, date)
);

alter table public.ai_usage enable row level security;

-- Пользователь видит и меняет только свою строку (сервер с JWT пользователя будет проходить RLS)
create policy "Users can read own ai_usage"
  on public.ai_usage for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert own ai_usage"
  on public.ai_usage for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update own ai_usage"
  on public.ai_usage for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Для удобства: лимиты задаются на сервере (25/15 в день), здесь только храним счётчики.
comment on table public.ai_usage is 'Daily AI request counts per user: tutor and homework check.';
