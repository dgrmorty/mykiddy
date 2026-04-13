# RLS, RPC и безопасность Supabase

#security #rls #supabase

---

## Принципы

1. **RLS включён** на пользовательских таблицах; аноним не должен получать чужие PII без политики.
2. Массовый `SELECT` по **`profiles`** с `IN (много id)` может конфликтовать с политикой «видимости» — для каталогов используются **RPC `SECURITY DEFINER`**: `list_community_students`, `list_showcase_authors`.
3. Публичная **лента одобренных постов** витрины: политика для **`anon`** на `project_posts` (только `status = 'approved'`) + RPC **`list_approved_showcase_posts`** как запасной путь при сбоях PostgREST.
4. **Лайки** `project_post_likes`: политики не «select true для всех» — см. миграцию `20260418120000_security_hardening.sql`.

---

## Ключевые RPC (публичный API БД)

| RPC | Назначение |
|-----|------------|
| `record_daily_streak()` | Стрик, обновление `profiles` (UTC-календарный день) |
| `increment_xp(x)` | Только +50 по правилам безопасности |
| `is_admin_user()` | Проверка админа по `profiles.role` |
| `list_community_students()` | Список учеников для Community |
| `list_showcase_authors(uuid[])` | Имена/аватары авторов витрины |
| `list_approved_showcase_posts(int)` | Лента одобренных постов (SECURITY DEFINER) |
| `showcase_like_counts(uuid[])` | Счётчики лайков пачкой |
| `update_own_profile_patch(...)` | Патч имени/аватара своего профиля |
| `profile_xp_rank(uuid)` | Ранг по XP |
| `get_all_users`, `delete_user_by_admin` | Админ-операции (grant только authenticated) |

Точные сигнатуры и `GRANT` — в `supabase/migrations/*.sql`.

---

## Express / CORS / ключи

- **Gemini** только на сервере; переменные нормализуются в `server.js` (BOM, кавычки).
- Клиент шлёт **JWT** в `Authorization` для `/api/*`, сервер поднимает `createClient` с этим JWT для **`ai_usage`** и проверки пользователя.

---

→ [[Architecture/База данных]] · [[DATABASE]] · [[Operations/Деплой-и-переменные-среды]]
