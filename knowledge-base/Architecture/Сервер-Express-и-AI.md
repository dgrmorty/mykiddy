# Сервер Express и AI (server.js)

#backend #gemini #railway

**Файл:** `mykiddy/server.js` (ESM, Node ≥18).

---

## Назначение

1. Прокси к **Google Gemini** (`@google/genai`) — ключи только из env сервера.
2. Раздача **статики** `dist/` (после `vite build`) и SPA fallback `GET *`.
3. Учёт использования ИИ в **`ai_usage`** через Supabase-клиент с JWT пользователя.

---

## Эндпоинты API

| Метод | Путь | Назначение |
|-------|------|------------|
| GET | `/api/health` | Статус + флаг AI |
| GET | `/api/ai-usage` | Остаток квоты тьютор/ДЗ на сегодня (Bearer) |
| POST | `/api/ai-tutor` | Вопрос по уроку; тело `{ question, context }` |
| POST | `/api/check-homework` | Проверка ДЗ; медиа/текст (лимит тела ~14MB) |

**Устаревшие названия в старых доках:** не существует отдельного `POST /api/chat` — используется **`/api/ai-tutor`**.

---

## Лимиты (env)

- `AI_DAILY_TUTOR_LIMIT` (дефолт 25)
- `AI_DAILY_HOMEWORK_LIMIT` (дефолт 15)
- `SUPABASE_URL`, `SUPABASE_ANON_KEY` — для `supabaseForUser(accessToken)` и записи в `ai_usage`.

---

## Клиентский вызов

- База URL: `config.ts` → `getApiUrl('api/...')` (учитывает `VITE_API_URL` или origin).
- Сервис: **`services/geminiService.ts`** — `askAiTutor`, `checkHomework`, `getAiUsageQuota`, `checkSystemHealth`, таймауты (например 90 с для тьютора).

---

→ [[Features/AI-тьютор]] · [[Features/Проверка домашних заданий]] · [[Architecture/Полная-карта-системы]]
