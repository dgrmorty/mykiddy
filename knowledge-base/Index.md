# MyKiddy — мастер-индекс базы знаний

#index #root

> **Начни с [[README]]** — порядок чтения для агента.  
> IT-школа «Дети В ТОПЕ» · https://github.com/dgrmorty/mykiddy

---

## Старт за 60 секунд

1. [[README]] — точка входа и стратегия обхода.
2. [[Architecture/Полная-карта-системы]] — слои: браузер ↔ Supabase ↔ Express ↔ Gemini.
3. [[cursor-rules/PROJECT]] — стек, запреты, дерево папок (обязательно перед большими изменениями).

---

## Архитектура и инфраструктура

| Заметка | О чём |
|---------|--------|
| [[Architecture/Архитектура]] | Схема провайдеров, роуты (кратко) |
| [[Architecture/Полная-карта-системы]] | Полная картина системы |
| [[Architecture/База данных]] | Таблицы домена, исправление имён (project_posts) |
| [[Architecture/RLS-RPC-и-безопасность]] | RLS, SECURITY DEFINER, публичная витрина |
| [[Architecture/Сервер-Express-и-AI]] | server.js, эндпоинты `/api/*`, лимиты |
| [[DATABASE]] | Инвентарь миграций: таблицы + RPC |
| [[Operations/Деплой-и-переменные-среды]] | VITE_*, Railway, Supabase CLI |
| [[Operations/Google-OAuth-и-auth-диагностика]] | Google OAuth, редиректы, troubleshooting |

---

## Код (реализация)

| Заметка | О чём |
|---------|--------|
| [[Code/Контексты]] | Auth, Content, Branding, Toast, Notification |
| [[Code/Роутинг-и-страницы]] | App.tsx, ProtectedRoute, StaffRoute, таблица URL |
| [[Code/Сервисы]] | supabase, contentService, gemini, projectShowcase |
| [[Code/Антипаттерны]] | Что не ломать |

---

## Роли и прогрессия

| Заметка | О чём |
|---------|--------|
| [[Roles/Роли пользователей]] | Student, Parent, Teacher, Admin, Guest |
| [[Roles/Система-прогрессии]] | XP, уровни, стрики, progression.ts |

---

## Фичи (продукт)

| Заметка | О чём |
|---------|--------|
| [[Features/Видеоуроки]] | Курс → модуль → урок, прогресс |
| [[Features/AI-тьютор]] | `/api/ai-tutor`, лимиты |
| [[Features/Проверка домашних заданий]] | `/api/check-homework`, CourseDetail |
| [[Features/Витрина проектов]] | project_posts, модерация, лайки |
| [[Features/Расписание]] | schedule_events |
| [[Features/Профиль и геймификация]] | Профиль, бейджи, стрики |
| [[Features/AdminPanel]] | Курсы, юзеры, расписание, модерация витрины |
| [[Features/Мобильная версия]] | Capacitor + mykiddymobile |

---

## Репозитории и риски

| Заметка | О чём |
|---------|--------|
| [[Репозитории/Монорепо-mykinymobile]] | Связь веб ↔ Expo |
| [[Risks/Слабые-места-и-риски]] | Админ-email, устаревшие имена API в старых doc |

---

## Быстрые факты

| | |
|--|--|
| **Стек** | React 18 + TS + Vite + Tailwind + Supabase + Gemini через Express |
| **Фронт прод** | Обычно Vercel (см. Operations) |
| **API AI** | Railway `server.js` |
| **БД** | Supabase PostgreSQL |
| **XP / уровень** | 500 XP на уровень (`progression.ts`) |
| **AI endpoints** | `POST /api/ai-tutor`, `POST /api/check-homework`, `GET /api/ai-usage`, `GET /api/health` |

---

## Устаревшие или объединённые черновики

Старые версии заметок могли содержать **`community_posts`** и **`/api/chat`** — см. актуальные [[Architecture/База данных]] и [[Architecture/Сервер-Express-и-AI]].
