# Knowledge Base Entry Point

Start here when exploring the knowledge base for **MyKiddy** (Дети В ТОПЕ).

## How to use (Cursor / AI)

1. Read this file first, then open **`Index.md`** for the full map and wikilinks.
2. Deep product + stack rules: **`cursor-rules/PROJECT.md`** (обязательно перед крупными изменениями кода).
3. **Supabase schema snapshot (авто из миграций):** `DATABASE.md` — сверяй с `supabase/migrations/`; при расхождении источник истины — миграции и `supabase db push`.

## Main sections

| Section | Path |
|--------|------|
| **Features** | [`Features/`](Features/) — витрина, AI-тьютор, видеоуроки |
| **Roles** | [`Roles/`](Roles/) — роли пользователей и доступ |
| **Architecture** | [`Architecture/`](Architecture/) — архитектура, база данных (описание домена) |

## Корневые файлы

| File | Purpose |
|------|---------|
| [`Index.md`](Index.md) | Карта всей базы, быстрые факты, навигация `[[wikilinks]]` |
| [`DATABASE.md`](DATABASE.md) | Таблицы и RPC из локальных SQL-миграций (дополнение к «База данных.md») |
| [`cursor-rules/PROJECT.md`](cursor-rules/PROJECT.md) | Правила разработки и стек для Cursor |

---

Always begin analysis from **this file**, then **`Index.md`**.
