
# 🚀 Kiddy OS: AI Campus Platform

### Технологический стек:
- **Backend:** Node.js + Express (Proxy for Gemini API)
- **Frontend:** React + Tailwind CSS (via ESM)
- **AI:** Google Gemini 2.5/3.0
- **Database:** Supabase (Auth & Profiles)
- **Infrastructure:** Railway.app

### Деплой:
1. Загрузить в Private GitHub.
2. Подключить к Railway.
3. Установить переменную окружения `API_KEY`.

### Безопасность:
Ключи API никогда не передаются на фронтенд. Все запросы идут через `/api/*` прокси-слой.
