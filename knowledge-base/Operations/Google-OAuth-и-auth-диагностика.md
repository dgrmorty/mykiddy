# Google OAuth и auth-диагностика

#oauth #google #supabase #operations

---

## Что уже сделано в проекте

- Клиентский OAuth-редирект в `AuthModal` унифицирован на корень SPA: `redirectTo = origin + '/'`.
- В `AuthContext` добавлено окно `oauthRecovery`, чтобы не сбрасывать пользователя в гостя на гонке `INITIAL_SESSION`.
- Для `record_daily_streak` убрано блокирование UI: RPC вызывается в фоне.
- Для `useContent/contentService` добавлены таймауты и защита от зависания на "Загружаем курсы...".
- В БД добавлена миграция `20260422120000_public_catalog_and_schedule_anon_read.sql`:
  - публичный `SELECT` для `courses`, `modules`, `lessons`, `schedule_events`.

---

## Рабочий эталон конфигурации OAuth

### Supabase → Authentication → Providers → Google

- `Enabled = true`.
- Вставлены актуальные `Client ID` и `Client Secret` из Google Cloud OAuth client.

### Supabase → Authentication → URL Configuration

- `Site URL`: `https://mykiddy-production.up.railway.app`
- В `Redirect URLs` есть:
  - `https://mykiddy-production.up.railway.app/`
  - `http://localhost:5173/` (для локальной разработки)

### Google Cloud → OAuth 2.0 Client (Web application)

- `Authorized JavaScript origins`:
  - `https://mykiddy-production.up.railway.app`
  - `http://localhost:5173`
- `Authorized redirect URIs`:
  - `https://twaepaurydscpcgfgtuc.supabase.co/auth/v1/callback`

Важно: в `JavaScript origins` нельзя путь и завершающий `/`.

---

## Почему вход через Google может не работать

1. OAuth consent screen в режиме `Testing`, а пользователь не добавлен в `Test users`.
2. Неверный `Client Secret` в Supabase (сменили в Google, но не обновили в Supabase).
3. Нет нужных `Authorized JavaScript origins` в Google Cloud.
4. В `Redirect URLs` Supabase не совпадает точный URL корня приложения.
5. После изменения `VITE_*` не сделан redeploy, и фронт работает на старом env.

---

## Что агент должен проверить первым

1. `VITE_SUPABASE_URL` и `SUPABASE_URL` указывают на один и тот же `project-ref`.
2. Google provider включён в Supabase.
3. URL-ы в Supabase и Google Cloud соответствуют эталону выше.
4. OAuth consent screen: `Testing`/`In production` и наличие test user при `Testing`.
5. В консоли браузера строки `[Auth]`/`[AuthModal]` после клика по Google.

---

## Команды CLI, которые уже использовались

- Проверка миграций: `supabase migration list`
- Линт удалённой схемы: `supabase db lint --linked`
- Применение миграций: `supabase db push --linked`
- Проверка RLS политик: `supabase db query --linked "...pg_policy..."`

Примечание: у Supabase CLI нет прямой команды вида `supabase logs` для Auth-логов Dashboard.

