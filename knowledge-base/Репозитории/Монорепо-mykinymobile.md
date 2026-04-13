# Монорепо: mykiddy и mykiddymobile

#mobile #expo #parity

---

## mykiddy (этот репозиторий)

- **Веб:** Vite + React, основная кодовая база фич.
- **Capacitor:** можно собирать Android APK (`npm run apk` и скрипты в `package.json`).

---

## mykiddymobile

- Отдельное приложение **Expo (React Native)** в соседней папке **`mykiddymobile/`** (в workspace `dev`).
- Те же **Supabase** credentials (через свой `config` / env).
- Те же бэкенд-маршруты **`/api/ai-tutor`**, **`/api/check-homework`** на Railway.
- Часть экранов продублирована (Dashboard, Community, Profile, Courses и т.д.) — при изменении контрактов API или RLS проверяй **оба** клиента.

---

## Что синхронизировать при изменениях

- Схема БД / RPC → оба клиента только читают через Supabase.
- Форматы тел **`/api/check-homework`** / ответов AI → `geminiService` (web) и аналог в mobile.
- Тексты ошибок и лимиты AI — единая политика на сервере.

---

→ [[Architecture/Полная-карта-системы]] · [[Features/Мобильная версия]]
