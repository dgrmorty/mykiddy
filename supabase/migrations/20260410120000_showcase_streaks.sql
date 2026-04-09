-- Витрина проектов (модерация), лайки, стрики, расширение уведомлений.

begin;

-- ─── Профиль: стрики (UTC-дата последней активности) ─────────────────────
alter table public.profiles
  add column if not exists streak_current integer not null default 0,
  add column if not exists streak_longest integer not null default 0,
  add column if not exists streak_last_activity_date date;

-- ─── Посты витрины ───────────────────────────────────────────────────────
create table if not exists public.project_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  phrase_selections jsonb not null default '{}'::jsonb,
  media jsonb not null default '[]'::jsonb,
  reject_reason text,
  moderated_at timestamptz,
  moderator_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists project_posts_status_created_idx
  on public.project_posts (status, created_at desc);
create index if not exists project_posts_author_idx
  on public.project_posts (author_id, created_at desc);

-- ─── Лайки (только смысл при approved; проверка на клиенте + политика) ─────
create table if not exists public.project_post_likes (
  post_id uuid not null references public.project_posts (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create index if not exists project_post_likes_user_idx
  on public.project_post_likes (user_id);

-- ─── RLS посты ───────────────────────────────────────────────────────────
alter table public.project_posts enable row level security;

drop policy if exists "project_posts_select_approved" on public.project_posts;
create policy "project_posts_select_approved"
  on public.project_posts for select
  to authenticated
  using (
    status = 'approved'
    or author_id = auth.uid()
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and lower(trim(coalesce(p.role::text, ''))) = 'admin'
    )
  );

drop policy if exists "project_posts_insert_student_own" on public.project_posts;
create policy "project_posts_insert_student_own"
  on public.project_posts for insert
  to authenticated
  with check (
    author_id = auth.uid()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and lower(trim(coalesce(p.role::text, ''))) = 'student'
    )
  );

drop policy if exists "project_posts_delete_own_pending_rejected" on public.project_posts;
create policy "project_posts_delete_own_pending_rejected"
  on public.project_posts for delete
  to authenticated
  using (
    author_id = auth.uid() and status in ('pending', 'rejected')
  );

drop policy if exists "project_posts_update_admin_moderate" on public.project_posts;
create policy "project_posts_update_admin_moderate"
  on public.project_posts for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and lower(trim(coalesce(p.role::text, ''))) = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and lower(trim(coalesce(p.role::text, ''))) = 'admin'
    )
  );

-- ─── RLS лайки ─────────────────────────────────────────────────────────────
alter table public.project_post_likes enable row level security;

drop policy if exists "project_likes_select_all" on public.project_post_likes;
create policy "project_likes_select_all"
  on public.project_post_likes for select
  to authenticated
  using (true);

drop policy if exists "project_likes_insert_student" on public.project_post_likes;
create policy "project_likes_insert_student"
  on public.project_post_likes for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and lower(trim(coalesce(p.role::text, ''))) = 'student'
    )
    and exists (
      select 1 from public.project_posts po
      where po.id = post_id and po.status = 'approved' and po.author_id <> auth.uid()
    )
  );

drop policy if exists "project_likes_delete_own" on public.project_post_likes;
create policy "project_likes_delete_own"
  on public.project_post_likes for delete
  to authenticated
  using (user_id = auth.uid());

-- ─── Уведомления: новые виды ─────────────────────────────────────────────
alter table public.activity_notifications drop constraint if exists activity_notifications_kind_check;
alter table public.activity_notifications add constraint activity_notifications_kind_check
  check (kind in (
    'friend_request',
    'friend_accepted',
    'project_moderation',
    'project_approved',
    'project_rejected'
  ));

-- ─── Стрик: один раз в календарный день UTC ───────────────────────────────
create or replace function public.record_daily_streak()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
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

  if last_d is null then
    new_cur := 1;
  elsif last_d = today then
    return jsonb_build_object('ok', true, 'streak_current', coalesce(cur, 0), 'streak_longest', coalesce(lng, 0), 'unchanged', true);
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

  return jsonb_build_object('ok', true, 'streak_current', new_cur, 'streak_longest', greatest(coalesce(lng, 0), new_cur));
end;
$$;

revoke all on function public.record_daily_streak() from public;
grant execute on function public.record_daily_streak() to authenticated;

-- ─── Уведомить всех админов о новом посте ─────────────────────────────────
create or replace function public.fn_notify_admins_project_moderation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'pending' then
    insert into public.activity_notifications (recipient_id, kind, actor_id, payload)
    select a.id, 'project_moderation', new.author_id,
           jsonb_build_object('post_id', new.id::text)
    from public.profiles a
    where lower(trim(coalesce(a.role::text, ''))) = 'admin';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_project_post_admin_notify on public.project_posts;
create trigger trg_project_post_admin_notify
  after insert on public.project_posts
  for each row
  execute function public.fn_notify_admins_project_moderation();

-- ─── Автору: одобрено / отклонено ────────────────────────────────────────
create or replace function public.fn_notify_author_project_moderation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status = 'pending' and new.status = 'approved' then
    insert into public.activity_notifications (recipient_id, kind, actor_id, payload)
    values (
      new.author_id,
      'project_approved',
      new.moderator_id,
      jsonb_build_object('post_id', new.id::text)
    );
  elsif old.status = 'pending' and new.status = 'rejected' then
    insert into public.activity_notifications (recipient_id, kind, actor_id, payload)
    values (
      new.author_id,
      'project_rejected',
      new.moderator_id,
      jsonb_build_object(
        'post_id', new.id::text,
        'reason', coalesce(new.reject_reason, '')
      )
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_project_post_author_notify on public.project_posts;
create trigger trg_project_post_author_notify
  after update on public.project_posts
  for each row
  execute function public.fn_notify_author_project_moderation();

-- ─── Storage: бакет витрины (публичное чтение) ─────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'project_showcase',
  'project_showcase',
  true,
  52428800,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm', 'video/quicktime']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "project_showcase read" on storage.objects;
create policy "project_showcase read"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'project_showcase');

drop policy if exists "project_showcase insert own" on storage.objects;
create policy "project_showcase insert own"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'project_showcase'
    and split_part(name, '/', 1) = auth.uid()::text
  );

drop policy if exists "project_showcase update own" on storage.objects;
create policy "project_showcase update own"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'project_showcase'
    and split_part(name, '/', 1) = auth.uid()::text
  );

drop policy if exists "project_showcase delete own" on storage.objects;
create policy "project_showcase delete own"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'project_showcase'
    and split_part(name, '/', 1) = auth.uid()::text
  );

-- Подсчёт лайков пачкой (без выгрузки всех строк)
create or replace function public.showcase_like_counts(target_ids uuid[])
returns table (post_id uuid, cnt bigint)
language sql
stable
security definer
set search_path = public
as $$
  select l.post_id, count(*)::bigint
  from public.project_post_likes l
  where l.post_id = any(target_ids)
  group by l.post_id;
$$;

revoke all on function public.showcase_like_counts(uuid[]) from public;
grant execute on function public.showcase_like_counts(uuid[]) to authenticated;

commit;
