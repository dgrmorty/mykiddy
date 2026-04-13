# 🏠 MyKiddy — База знаний проекта
#index #root

> IT-школа «Дети В ТОПЕ» | https://github.com/dgrmorty/mykiddy

**Точка входа для Cursor:** [`README.md`](README.md) · Автоснимок SQL: [`DATABASE.md`](DATABASE.md)

---

## 🗺 Навигация

### Архитектура
- [[Architecture/Архитектура]] — общая схема системы, слои, потоки данных
- Стек и зависимости — см. [[cursor-rules/PROJECT]]
- Окружение и деплой — см. [[cursor-rules/PROJECT]] (секции env / Railway / Vercel)

### База данных
- [[Architecture/База данных]] — схема таблиц Supabase, связи, RLS (описание)
- [[DATABASE]] — таблицы/RPC из папки `supabase/migrations/` (машинный список)

### Роли и пользователи
- [[Roles/Роли пользователей]] — Student, Parent, Teacher, Admin, Guest
- [[Система прогрессии]] — XP, уровни, стрики, геймификация

### Фичи
- [[Features/Видеоуроки]] — модули, уроки, прогресс
- [[Features/AI-тьютор]] — чат с нейронкой по теме урока
- [[Features/Проверка домашних заданий]] — AI-фидбэк на ДЗ
- [[Features/Витрина проектов]] — сообщество, публикации
- [[Features/Расписание]] — еженедельное расписание занятий
- [[Features/Профиль и геймификация]] — XP, радар навыков
- [[Features/AdminPanel]] — управление всем контентом
- [[Features/Мобильная версия]] — Android через Capacitor

### Код
- [[Контексты]] — AuthContext, ContentContext, BrandingContext, ToastContext
- [[Страницы (views)]] — все роуты и их компоненты
- [[Сервисы]] — Supabase сервис, AI сервис
- [[Антипаттерны]] — что нельзя делать в коде

### Документация проекта
- [[Слабые места]] — известные проблемы (из WEAK_SPOTS.md)
- [[Аудит безопасности]] — RLS, ключи, CORS

---

## ⚡ Быстрые факты

| | |
|--|--|
| **Стек** | React 18 + TS + Vite + Supabase + Gemini |
| **Деплой фронт** | Vercel |
| **Деплой бэкенд** | Railway (Express) |
| **БД** | Supabase (PostgreSQL) |
| **AI** | Google Gemini через сервер |
| **Мобайл** | Capacitor (Android) |
| **Роли** | Student / Parent / Teacher / Admin / Guest |
| **Курсы** | Python / Web / Robotics / 3D Design |
| **XP на уровень** | 500 |
