# DATABASE — снимок схемы из репозитория миграций

> **Источник истины:** папка [`../supabase/migrations/`](../supabase/migrations/) и связанный проект Supabase (`supabase db push --linked`).  
> Этот файл дополняет человекочитаемое описание в [`Architecture/База данных.md`](Architecture/База%20данных.md).  
> Полный дамп БД через CLI локально может требовать Docker (`supabase db dump`).

## Таблицы (упоминания `create table` в миграциях)

| Таблица | Файл миграции (первое появление) |
|---------|-----------------------------------|
| `friendships` | `20260405190000_friendships_and_student_profiles_read.sql` |
| `activity_notifications` | `20260405210000_activity_notifications.sql` |
| `project_posts` | `20260410120000_showcase_streaks.sql` |
| `project_post_likes` | `20260410120000_showcase_streaks.sql` |

Таблицы **`profiles`**, **`courses`**, **`modules`**, **`lessons`**, **`user_progress`**, **`homework_submissions`**, **`schedule_events`** и др. описаны в [`Architecture/База данных.md`](Architecture/База%20данных.md); DDL части из них могут быть созданы вне текущей папки миграций в истории проекта — при сомнениях смотри **SQL Editor** в Supabase или `pg_dump` с продакшена.

## Колонки / ALTER (примеры из миграций)

- `profiles`: стрики, `avatar_accessory`, бандлы аватаров — см. `20260410120000_showcase_streaks.sql`, `20260415180000_*`, `20260416100000_*`.
- `courses`: `course_year_tier` — `20260405140000_add_course_year_tier.sql`.

## Функции и RPC (публичные, по grep миграций)

| Функция | Назначение (кратко) |
|---------|---------------------|
| `record_daily_streak()` | Ежедневный стрик в `profiles` |
| `list_community_students()` | Каталог учеников для сообщества |
| `list_showcase_authors(uuid[])` | Авторы витрины (обход RLS на `profiles`) |
| `list_approved_showcase_posts(int)` | Лента одобренных постов (SECURITY DEFINER) |
| `showcase_like_counts(uuid[])` | Счётчики лайков по постам |
| `update_own_profile_patch(...)` | Патч имени/аватара |
| `is_admin_user()` | Проверка админа по `profiles.role` |
| `increment_xp(integer)` | Начисление XP (+50) |
| `profile_xp_rank(uuid)` | Ранг по XP |
| `delete_user_by_admin(uuid)` | Удаление пользователя админом |
| `get_all_users()` | Список пользователей (админ) |
| Триггерные notify для витрины / дружбы | `fn_notify_*`, `fn_activity_notify_friendship` |

Актуальные сигнатуры и `GRANT` — в соответствующих `.sql` файлах.

## RLS и безопасность

Центральный файл: `20260418120000_security_hardening.sql` (политики `profiles`, лайки витрины, отзывы grant на RPC).

---

*Сгенерировано для Cursor; обновляйте вручную при крупных изменениях схемы или регенерируйте список из `rg 'create table' supabase/migrations`.*
