# PROJECT: MyKiddy — IT-школа «Дети В ТОПЕ»

> Это онбординг-файл для Cursor AI. Читай его полностью перед ЛЮБЫМ изменением кода.
> Нарушение правил ниже = баги в проде с реальными детьми.

---

## 🎯 ЧТО ЭТО ЗА ПРОЕКТ

Веб-приложение (+ Android через Capacitor) для онлайн-обучения детей в IT-школе.
Три типа пользователей взаимодействуют через одну платформу: ученики проходят курсы,
родители следят за прогрессом, учителя/админы управляют контентом.

**Живой деплой:** https://mykiddy.vercel.app

---

## 🏗 СТЕК — НЕ МЕНЯЙ БЕЗ ЯВНОГО ЗАПРОСА

| Слой | Технология | Версия |
|------|-----------|--------|
| Frontend | React + TypeScript | 18 / 5.x |
| Сборка | Vite | ^5.1 |
| Стили | Tailwind CSS | ^3.4 |
| Роутинг | React Router DOM | v6 |
| БД + Auth | Supabase | ^2.39 |
| AI | Google Gemini (`@google/genai`) | ^1.41 |
| 3D | Three.js + React Three Fiber | r183 / ^8 |
| Графики | Recharts | ^2.12 |
| Иконки | Lucide React | ^0.344 |
| Бэкенд | Express.js (Node ≥18) | ^4.18 |
| Деплой сервера | Railway | — |
| Мобайл | Capacitor | ^6 |

**ЗАПРЕЩЕНО:** не добавляй новые UI-библиотеки (MUI, Chakra, Ant Design и т.д.) без запроса.
**ЗАПРЕЩЕНО:** не заменяй Tailwind на CSS-in-JS.
**ЗАПРЕЩЕНО:** не трогай capacitor.config.json и android/ без явной задачи по мобайлу.

---

## 📁 СТРУКТУРА ПРОЕКТА

```
/
├── App.tsx                  # Корень: провайдеры + роутинг
├── index.tsx                # ReactDOM.render
├── types.ts                 # ВСЕ TypeScript типы — только сюда
├── constants.ts             # Мок-данные для разработки (MOCK_COURSES и др.)
├── progression.ts           # Логика XP и уровней (XP_PER_LEVEL=500)
├── config.ts                # API_BASE_URL + getApiUrl()
├── server.js                # Express-сервер: AI-прокси + статика
│
├── contexts/                # React Context провайдеры
│   ├── AuthContext.tsx      # Текущий юзер, роль, isGuest, isLoading
│   ├── BrandingContext.tsx  # Цвета, логотип, название школы
│   ├── ContentContext.tsx   # Курсы, модули, уроки, прогресс
│   └── ToastContext.tsx     # Глобальные уведомления
│
├── views/                   # Страницы (роуты)
│   ├── Dashboard.tsx        # Главная: прогресс, статы, быстрый доступ
│   ├── CourseDetail.tsx     # Страница курса: модули, уроки, видео
│   ├── Profile.tsx          # Профиль ученика: XP, уровень, достижения
│   ├── Schedule.tsx         # Расписание занятий
│   ├── Community.tsx        # Сообщество: посты, витрина проектов
│   ├── AdminPanel.tsx       # Управление курсами, юзерами, расписанием
│   ├── Settings.tsx         # Настройки аккаунта
│   ├── Notifications.tsx    # Уведомления
│   └── UserPublicProfile.tsx# Публичный профиль другого ученика
│
├── components/              # Переиспользуемые компоненты
│   └── Layout.tsx           # Обёртка: навбар + сайдбар + outlet
│
├── hooks/                   # Кастомные React-хуки
├── services/                # Supabase клиент и сервисные функции
├── data/                    # Статические данные
├── utils/                   # Утилиты
└── supabase/migrations/     # SQL-миграции схемы БД
```

---

## 👥 РОЛИ ПОЛЬЗОВАТЕЛЕЙ

```typescript
enum Role {
  STUDENT = 'Student',   // Ученик — основной пользователь
  PARENT  = 'Parent',    // Родитель — следит за прогрессом ребёнка
  TEACHER = 'Teacher',   // Учитель — работает с контентом
  ADMIN   = 'Admin',     // Полный доступ, включая AdminPanel
  GUEST   = 'Guest',     // Не авторизован — только Dashboard (readonly)
}
```

**Важно:**
- `GUEST` → видит только `/`, не может перейти на защищённые роуты
- `ADMIN` → определяется по email через `VITE_ADMIN_EMAILS` (env), НЕ по полю в БД
- `ProtectedRoute` блокирует гостей; `StaffRoute` блокирует всех кроме ADMIN

---

## 📚 МОДЕЛЬ ДАННЫХ (иерархия обучения)

```
Course (курс)
  └── Module[] (модуль/раздел)
        └── Lesson[] (урок)
              ├── videoUrl?      — ссылка на YouTube
              ├── codeSnippet?   — блок кода для практики
              ├── homeworkTask?  — текст домашнего задания
              ├── isCompleted    — прошёл ли ученик
              └── locked         — доступен ли урок
```

### Типы курсов (CourseType)
```
'Python Мастер'      — программирование, алгоритмы, AI
'Web Архитектор'     — HTML/CSS/JS, фронтенд
'Робототехника Core' — физика + код + железо
'3D Дизайн'          — Blender, моделирование
```

### Год обучения (CourseYearTier)
```
'year_1'      — первый год, базовый уровень
'year_2_plus' — второй год и выше, продвинутый
```

---

## 🗄 БАЗА ДАННЫХ (Supabase)

**Провайдер:** Supabase (PostgreSQL + встроенный Auth)
**Клиент:** `services/supabase.ts` — НЕ создавай новый клиент, используй существующий

### Основные таблицы

| Таблица | Назначение |
|---------|-----------|
| `profiles` | Расширение auth.users: name, role, avatar, xp, level, is_approved |
| `courses` | Курсы: title, description, type, cover_image, year_tier |
| `modules` | Модули курса: course_id (FK), title, sort_order |
| `lessons` | Уроки: module_id (FK), title, description, video_url, homework_task, locked |
| `user_progress` | Прогресс: user_id (FK), lesson_id (FK), completed_at |
| `schedule_events` | Расписание: day_of_week(1-7), time_start, time_end, title, location |
| `community_posts` | Посты сообщества / витрина проектов |
| `notifications` | Уведомления пользователей |
| `settings` | Глобальные настройки школы (branding и т.д.) |

### Правила работы с Supabase
- Всегда используй `supabase` клиент из `services/supabase.ts`
- Для чтения данных — через `ContentContext`, не напрямую в компонентах
- RLS включён — анонимные запросы на запись ЗАБЛОКИРОВАНЫ
- Admin-операции (удаление юзеров, правка курсов) требуют JWT с ролью admin
- Функции: `delete_user_by_admin`, `get_all_users` — вызывать только из AdminPanel

---

## 🤖 AI-ФУНКЦИИ

### Архитектура AI

```
Браузер → config.ts (getApiUrl) → Express server.js → Google Gemini API
```

**НИКОГДА** не вызывай Gemini напрямую из фронта — только через `/api/*` эндпоинты.
API_KEY хранится в переменных Railway, в коде не светится.

### Эндпоинты AI (server.js)

| Эндпоинт | Назначение |
|----------|-----------|
| `POST /api/chat` | AI-тьютор: отвечает на вопросы по теме урока |
| `POST /api/check-homework` | Проверка домашнего задания ученика |
| `GET /api/ai-usage` | Статистика использования AI |

### Лимиты AI (rate limiting)
- Лимиты по JWT (per user) и по дням
- Санитизация входных данных — защита от prompt injection
- Не убирай rate limiting без явного запроса!

---

## 🎮 СИСТЕМА ПРОГРЕССИИ (progression.ts)

```typescript
XP_PER_LEVEL = 500

levelFromXp(xp)           // floor(xp / 500) + 1
xpLevelProgressPercent(xp) // прогресс внутри уровня, 0–100%
```

Начисление XP: за завершение урока, стрик (streak), достижения.
Поля в `profiles`: `xp`, `level`, `streak_current`, `streak_longest`

---

## 🚀 КЛЮЧЕВЫЕ ФИЧИ

### 1. Видеоуроки
- Уроки содержат `videoUrl` (YouTube) + `codeSnippet` + `homeworkTask`
- Прогресс (`isCompleted`) синхронизируется в `user_progress`
- Уроки могут быть `locked` (недоступны до завершения предыдущих)

### 2. AI-тьютор (чат)
- Контекст урока передаётся в промпт — тьютор знает тему
- Защита от нерелевантных вопросов (prompt injection guard)
- Лимит запросов в сутки на пользователя

### 3. Проверка домашних заданий (AI)
- `homeworkTask` из урока — текст задания
- Ученик присылает ответ → `POST /api/check-homework`
- Gemini анализирует и возвращает фидбэк

### 4. Витрина проектов (Community)
- Ученики публикуют свои проекты
- `community_posts` таблица
- Доступно только авторизованным пользователям

### 5. Расписание (Schedule)
- Еженедельное расписание занятий
- `schedule_events`: day_of_week (1=Пн, 7=Вс), time_start, title, location
- Управляется из AdminPanel

### 6. Профиль и геймификация
- XP, уровень, стрики
- Радар-график навыков (Recharts): Логика, Синтаксис, Архитектура, Отладка, Креатив, Скорость
- Публичный профиль `/users/:userId`

### 7. AdminPanel (только Role.ADMIN)
- CRUD курсов, модулей, уроков
- Управление расписанием
- Список всех пользователей (`get_all_users` RPC)
- Удаление пользователей (`delete_user_by_admin` RPC)
- Настройки брендинга школы

### 8. Мобильная версия (Android)
- Capacitor поверх того же React-кода
- Сборка: `npm run apk`
- Конфиг: `capacitor.config.json`

---

## ⚡ КОНТЕКСТЫ — КАК ПОЛУЧАТЬ ДАННЫЕ

```typescript
// Текущий пользователь
const { user, isGuest, isLoading } = useAuth()

// Брендинг школы
const { branding } = useBranding()

// Курсы и прогресс
const { courses, progress, markLessonComplete } = useContent()

// Уведомления
const { showToast } = useToast()
```

**НЕ** делай прямые запросы к Supabase в компонентах — используй контексты и хуки.

---

## 🎨 СТИЛИ И ДИЗАЙН

**Tailwind** — основа. Кастомные CSS-переменные:
```
--kiddy-cherry:       #e6002b  (основной акцент, красный)
--kiddy-text:         #ffffff
--kiddy-textSecondary: приглушённый белый
```

Фон приложения: `#050505` (почти чёрный)
Анимации: `animate-glow-pulse`, `animate-fade-in`, `animate-spin`

**НЕ** используй inline-стили там где можно обойтись Tailwind-классами.

---

## 🔧 ОКРУЖЕНИЕ (.env переменные)

| Переменная | Где | Назначение |
|-----------|-----|-----------|
| `VITE_SUPABASE_URL` | Vercel / .env | URL проекта Supabase |
| `VITE_SUPABASE_ANON_KEY` | Vercel / .env | Публичный anon ключ |
| `VITE_ADMIN_EMAILS` | Vercel / .env | Emails админов через запятую |
| `VITE_API_URL` | Vercel / .env | URL Express-сервера на Railway |
| `API_KEY` | Railway | Gemini API Key (ТОЛЬКО сервер) |
| `PORT` | Railway | Порт сервера |

---

## 🚫 АНТИПАТТЕРНЫ — НИКОГДА НЕ ДЕЛАЙ ТАК

1. **Не вызывай Gemini из фронта** — только через `/api/*` сервера
2. **Не создавай новый Supabase client** — используй `services/supabase.ts`
3. **Не пиши бизнес-логику в компонентах** — выноси в хуки или контексты
4. **Не проверяй роль только на фронте** — RLS в Supabase обязателен
5. **Не убирай rate limiting** с AI-эндпоинтов
6. **Не добавляй новые типы** вне `types.ts`
7. **Не хардкодь тексты** — приложение на русском, все строки осмысленны
8. **Не трогай android/** без задачи по мобайлу
9. **Не делай прямые fetch к Supabase в компонентах** — используй контексты
10. **Не удаляй console.error** в сервисах — они нужны для дебага на Railway

---

## ✅ ЧЕКЛИСТ ПЕРЕД КОММИТОМ

- [ ] Новые типы добавлены в `types.ts`
- [ ] Компонент использует контексты, а не прямые запросы
- [ ] AI-вызовы идут через `getApiUrl()` из `config.ts`
- [ ] Tailwind-классы, не inline-стили
- [ ] Роут защищён нужным guard-ом (ProtectedRoute / StaffRoute)
- [ ] Лимиты на AI не сняты
