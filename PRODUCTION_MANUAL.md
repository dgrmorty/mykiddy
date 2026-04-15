# Ручной чеклист продакшена и отладки

Здесь — **что делаешь ты** (Dashboard, ключи, домены) и **что можно прислать в чат**, если нужна помощь. Подробности по каждой переменной — в **`ENV_SETUP_GUIDE.md`**.

---

## Что уже сделано со стороны кода и БД (репозиторий)

Тебе это **не нужно повторять**, только знать:

- Логика авторизации (OAuth, гость, загрузка), таймауты загрузки курсов, кэш при выходе.
- В Supabase применены миграции, в том числе **публичное чтение** каталога курсов и расписания для неавторизованных (`anon`).
- В репозитории есть `supabase/config.toml`, скрипты `npm run supabase:migrations`, `supabase:lint`, `supabase:push`.

Если заводишь **новый** проект Supabase с нуля — с машины с CLI: `supabase link` и `supabase db push` из корня проекта.

---

## Шаг 1. Один источник правды по Supabase

1. Зайди на [supabase.com](https://supabase.com) → открой **тот** проект, под который у тебя в Railway (или на хостинге) заданы `VITE_SUPABASE_*`.
2. **Settings → API**:
   - Скопируй **Project URL** (вид `https://xxxx.supabase.co`, **без** слеша в конце).
   - Скопируй **anon public** ключ (длинный JWT).

**Важно:** `VITE_SUPABASE_URL` и `SUPABASE_URL` должны быть **одинаковыми** (тот же проект). Иначе фронт ходит в одну базу, сервер — в другую.

---

## Шаг 2. Переменные на хостинге (Railway / аналог)

Добавь или проверь **Variables** сервиса, который **собирает** фронт и сервер.

### Обязательно

| Переменная | Значение |
|------------|----------|
| `VITE_SUPABASE_URL` | Project URL из шага 1 |
| `VITE_SUPABASE_ANON_KEY` | anon ключ из шага 1 |
| `SUPABASE_URL` | то же, что `VITE_SUPABASE_URL` |
| `SUPABASE_ANON_KEY` | то же, что `VITE_SUPABASE_ANON_KEY` |
| `VITE_ADMIN_EMAILS` | твой Google/email, с которым заходишь как админ (через запятую, без пробелов) |
| `API_KEY` | ключ Gemini с [aistudio.google.com/apikey](https://aistudio.google.com/apikey) |

### По ситуации

| Переменная | Когда нужна |
|------------|-------------|
| `VITE_API_URL` | Если фронт открывается с **другого** домена, чем API — укажи **полный** URL бэкенда без слеша в конце. Если SPA и API на **одном** домене — часто можно не задавать. |
| `CORS_ORIGIN` | Если фронт на домене A, API на B — укажи URL фронта (можно несколько через запятую). |
| `PORT` | На Railway обычно не трогаешь — подставляется платформой. |

После **любого** изменения `VITE_*` сделай **новый деплой / пересборку**, иначе в собранном JS останутся старые значения.

---

## Шаг 3. Supabase → URL (без этого Google «ломается»)

**Authentication → URL Configuration**

1. **Site URL** — тот адрес, по которому пользователь **реально** открывает приложение в проде, например:  
   `https://имя-сервиса.up.railway.app/`  
   или свой домен. Формат (со слешем или без) должен совпадать с тем, как ты добавишь в Redirect URLs.

2. **Redirect URLs** — добавь **каждый** вариант, с которого будет вход:
   - Прод: `https://твой-прод-домен/` (как в коде: редирект на **корень** `origin + '/'`).
   - Локально: `http://localhost:5173/` (если тестируешь OAuth локально).

Строки должны **точно** совпадать с URL в адресной строке (включая `http`/`https` и порт).

---

## Шаг 4. Google OAuth (вход через Google)

### 4.1. Google Cloud Console

1. [console.cloud.google.com](https://console.cloud.google.com) → выбери проект (или создай).
2. **APIs & Services → Credentials → Create credentials → OAuth client ID**.
3. Тип приложения: **Web application**.
4. **Authorized JavaScript origins** — добавь:
   - `https://твой-прод-домен` (без пути, без слеша в конце для корня — как требует Google).
   - Для локалки: `http://localhost:5173`
5. **Authorized redirect URIs** — **ровно одна** строка для Supabase (подставь **свой** project ref из URL проекта):  
   `https://<PROJECT_REF>.supabase.co/auth/v1/callback`  
   Пример: если Project URL `https://abcd.supabase.co`, то ref — `abcd`, полный callback:  
   `https://abcd.supabase.co/auth/v1/callback`

Сохрани **Client ID** и **Client secret**.

### 4.2. Supabase

**Authentication → Providers → Google**

- Включи провайдер **Google**.
- Вставь **Client ID** и **Client Secret** из п. 4.1.
- Сохрани.

---

## Шаг 5. Проверка после настройки

1. **Инкогнито**, без входа: главная открывается, курсы не висят вечной загрузкой (если долго — обнови страницу один раз).
2. **Вход email/пароль** — профиль, прогресс.
3. **Выход → Вход через Google** — не должен оставаться «Гостем»; если ошибка — читай текст на экране (мы выводим подсказку).

---

## Что прислать в чат, если «не работает» (без паролей и секретов)

Можно скопировать сюда **текстом** (секреты **не** вставляй):

1. **Публичный URL** сайта в проде (одна строка).
2. **Project ref** Supabase — кусок из `https://XXXX.supabase.co` (только `XXXX`, без ключей).
3. Точная **формулировка ошибки** на экране после «Войти через Google» или скрин.
4. Из консоли браузера (F12 → Console) строки, начинающиеся с `[Auth]` или `[AuthModal]` (можно обрезать лишнее).
5. Ответы на вопросы:
   - Site URL в Supabase совпадает с тем, как открываешь сайт?
   - В Redirect URLs добавлен именно `https://.../` твоего прод-домена?
   - В Google Cloud в redirect URI есть `https://XXXX.supabase.co/auth/v1/callback` для **того же** XXXX?

**Не присылай:** service role key, пароли БД, полный anon key в публичный чат (если не уверен — напиши только «ключи совпадают с Dashboard»).

---

## Шаг 6. CLI у себя (опционально)

Если ставишь [Supabase CLI](https://supabase.com/docs/guides/cli):

```bash
cd /path/to/mykiddy
supabase login
supabase link --project-ref ТВОЙ_REF
npm run supabase:migrations   # локальные миграции = облако?
```

Если появятся новые файлы в `supabase/migrations/` после `git pull`:

```bash
npm run supabase:push
```

---

## Краткий чеклист «всё ли я сделал»

- [ ] Один проект Supabase на все `SUPABASE_*` и `VITE_SUPABASE_*`
- [ ] Переменные на хостинге заданы, после смены `VITE_*` был redeploy
- [ ] Site URL и Redirect URLs в Supabase под твой реальный домен
- [ ] Google: redirect URI = `https://<ref>.supabase.co/auth/v1/callback`, ключи в Supabase Provider
- [ ] `VITE_ADMIN_EMAILS` содержит твой email
- [ ] `API_KEY` (Gemini) задан для ИИ

Если всё отмечено — дальше остаётся только синхронизировать домены между Google Cloud, Supabase URL и реальным URL приложения.
