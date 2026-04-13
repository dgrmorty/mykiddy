# AdminPanel

#feature #admin

**Файл:** `views/AdminPanel.tsx`.

---

## Доступ

- Роут `/admin` обёрнут в **`StaffRoute`** — только **`Role.ADMIN`** (email из `VITE_ADMIN_EMAILS` и нормализация роли).

---

## Вкладыки (представления)

- **Контент:** CRUD **`courses`**, **`modules`**, **`lessons`** (вложенность сохраняется).
- **Пользователи:** список через RPC **`get_all_users`**, удаление **`delete_user_by_admin`**.
- **Расписание:** CRUD **`schedule_events`**.
- **Витрина:** очередь **`project_posts`** со статусом `pending`, модерация approve/reject, причина отклонения в уведомлениях.

---

## После изменения курсов

- Вызывать **`invalidateCoursesCache`** (через `contentService`), чтобы клиенты подтянули новый контент.

---

→ [[Code/Роутинг-и-страницы]] · [[Architecture/RLS-RPC-и-безопасность]] · [[Features/Витрина проектов]]
