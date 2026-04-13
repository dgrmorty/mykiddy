# AI-тьютор

#feature #ai #gemini

---

## Назначение

Внутри **урока** (`CourseDetail`): чат по теме урока, контекст передаётся на сервер вместе с вопросом.

---

## Реальный поток (код)

```
CourseDetail
  → geminiService.askAiTutor(question, context, accessToken)
  → fetch POST getApiUrl('api/ai-tutor')  // не /api/chat
  → server.js → Google Gemini
  → опционально incrementTutorUsage → таблица ai_usage
```

---

## Сервер

- **`POST /api/ai-tutor`**, тело JSON: `{ question, context }`.
- Лимит дня: **`AI_DAILY_TUTOR_LIMIT`**, проверка через Supabase с JWT.
- Таймаут на клиенте ~90 с (`geminiService.ts`).

---

## Безопасность

- Промпт и санитизация на сервере; ключ Gemini только в env Railway.
- **Не** вызывать Gemini из браузера напрямую.

---

## Квота в UI

- **`GET /api/ai-usage`** — остаток на сегодня (`getAiUsageQuota`).

---

→ [[Architecture/Сервер-Express-и-AI]] · [[Features/Видеоуроки]] · [[Code/Сервисы]]
