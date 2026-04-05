-- Исправление: при INSERT в friendships триггер вставляет в activity_notifications.
-- При RLS без политики INSERT вся транзакция дружбы откатывалась.
--
-- Политика разрешает вставку только если есть соответствующая строка в friendships
-- (как при срабатывании триггера — нельзя подделать уведомление без реальной заявки).

begin;

drop policy if exists "activity_notifications_insert_friendship_events" on public.activity_notifications;
create policy "activity_notifications_insert_friendship_events"
  on public.activity_notifications
  for insert
  to authenticated
  with check (
    kind in ('friend_request', 'friend_accepted')
    and actor_id is not null
    and recipient_id is not null
    and (
      (
        kind = 'friend_request'
        and auth.uid() = actor_id
        and exists (
          select 1
          from public.friendships f
          where f.requester_id = actor_id
            and f.addressee_id = recipient_id
            and f.status = 'pending'
        )
      )
      or (
        kind = 'friend_accepted'
        and auth.uid() = actor_id
        and exists (
          select 1
          from public.friendships f
          where f.requester_id = recipient_id
            and f.addressee_id = actor_id
            and f.status = 'accepted'
        )
      )
    )
  );

commit;
