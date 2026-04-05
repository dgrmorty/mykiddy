-- Лента активности: заявки в друзья, принятие дружбы. Триггер на friendships.

begin;

create table if not exists public.activity_notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('friend_request', 'friend_accepted')),
  actor_id uuid references auth.users (id) on delete set null,
  payload jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists activity_notifications_recipient_created_idx
  on public.activity_notifications (recipient_id, created_at desc);

create index if not exists activity_notifications_unread_idx
  on public.activity_notifications (recipient_id)
  where read_at is null;

alter table public.activity_notifications enable row level security;

drop policy if exists "activity_notifications_select_own" on public.activity_notifications;
create policy "activity_notifications_select_own"
  on public.activity_notifications for select
  to authenticated
  using (auth.uid() = recipient_id);

drop policy if exists "activity_notifications_update_own" on public.activity_notifications;
create policy "activity_notifications_update_own"
  on public.activity_notifications for update
  to authenticated
  using (auth.uid() = recipient_id)
  with check (auth.uid() = recipient_id);

create or replace function public.fn_activity_notify_friendship()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' and new.status = 'pending' then
    insert into public.activity_notifications (recipient_id, kind, actor_id, payload)
    values (
      new.addressee_id,
      'friend_request',
      new.requester_id,
      jsonb_build_object('friendship_id', new.id::text)
    );
  elsif tg_op = 'UPDATE' and old.status = 'pending' and new.status = 'accepted' then
    insert into public.activity_notifications (recipient_id, kind, actor_id, payload)
    values (
      new.requester_id,
      'friend_accepted',
      new.addressee_id,
      jsonb_build_object('friendship_id', new.id::text)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_friendship_activity_notify on public.friendships;
create trigger trg_friendship_activity_notify
  after insert or update on public.friendships
  for each row
  execute function public.fn_activity_notify_friendship();

-- Включите Realtime для таблицы activity_notifications в Supabase → Database → Replication, если нужны мгновенные бейджи.

commit;
