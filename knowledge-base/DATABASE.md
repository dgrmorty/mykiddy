# DATABASE — инвентарь схемы (репозиторий + домен)

> Первичный источник DDL: **`supabase/migrations/`**. Этот файл — **навигация** для агента и людей. Полный `pg_dump` может требовать Docker.

---

## Таблицы из `create table` в миграциях

| Таблица | Файл (первое появление) |
|---------|-------------------------|
| `friendships` | `20260405190000_friendships_and_student_profiles_read.sql` |
| `activity_notifications` | `20260405210000_activity_notifications.sql` |
| `project_posts` | `20260410120000_showcase_streaks.sql` |
| `project_post_likes` | `20260410120000_showcase_streaks.sql` |

## Таблицы, используемые кодом (DDL может быть в более ранней истории или вне текущей папки)

`profiles`, `courses`, `modules`, `lessons`, `user_progress`, `schedule_events`, `settings`, `homework_submissions`, `ai_usage` — см. **`services/`**, **`views/`**, [[Architecture/База данных]].

---

## Функции и RPC (grep по миграциям)

| Имя | Назначение |
|-----|------------|
| `record_daily_streak()` | Стрик, UTC |
| `increment_xp(integer)` | XP +50 (ограничения в теле) |
| `is_admin_user()` | Админ? |
| `handle_new_user()` | Триггер профиля |
| `profile_xp_rank(uuid)` | Ранг |
| `delete_user_by_admin(uuid)` | Удаление юзера |
| `get_all_users()` | Список для админки |
| `list_community_students()` | Каталог учеников |
| `list_showcase_authors(uuid[])` | Авторы витрины |
| `list_approved_showcase_posts(int)` | Лента approved |
| `showcase_like_counts(uuid[])` | Лайки |
| `update_own_profile_patch(...)` | Патч профиля |
| `fn_notify_admins_project_moderation` | Триггер витрины |
| `fn_notify_author_project_moderation` | Триггер витрины |
| `fn_activity_notify_friendship` | Дружба → уведомления |

`GRANT`/`REVOKE` менялись в **`20260418120000_security_hardening.sql`** и последующих.

---

## Индексы и вспомогательное

- FK индексы (например `activity_notifications_actor_id`, `project_posts_moderator_id`) — см. `security_hardening` и соседние миграции.

---

## Практика для агента

1. Менять схему **только** новым файлом в `supabase/migrations/`.
2. После правок — **`supabase db push --linked`** на целевой проект.
3. При расхождении доки и кода — **код и миграции** побеждают.

---

→ [[Architecture/База данных]] · [[Architecture/RLS-RPC-и-безопасность]] · [[Operations/Деплой-и-переменные-среды]]
