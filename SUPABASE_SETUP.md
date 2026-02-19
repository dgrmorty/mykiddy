# Настройка базы данных Supabase

## Структура таблиц

### 1. Таблица `profiles`
```sql
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  name TEXT,
  role TEXT DEFAULT 'Student',
  avatar TEXT,
  level INTEGER DEFAULT 1,
  xp INTEGER DEFAULT 0,
  is_approved BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индекс для быстрого поиска
CREATE INDEX IF NOT EXISTS profiles_email_idx ON profiles(email);
CREATE INDEX IF NOT EXISTS profiles_role_idx ON profiles(role);
```

### 2. Таблица `courses`
```sql
CREATE TABLE IF NOT EXISTS courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  cover_image TEXT,
  type TEXT DEFAULT 'Course',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 3. Таблица `modules`
```sql
CREATE TABLE IF NOT EXISTS modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS modules_course_id_idx ON modules(course_id);
```

### 4. Таблица `lessons`
```sql
CREATE TABLE IF NOT EXISTS lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID REFERENCES modules(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  video_url TEXT,
  homework_task TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS lessons_module_id_idx ON lessons(module_id);
```

### 5. Таблица `user_progress`
```sql
CREATE TABLE IF NOT EXISTS user_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, lesson_id)
);

CREATE INDEX IF NOT EXISTS user_progress_user_id_idx ON user_progress(user_id);
CREATE INDEX IF NOT EXISTS user_progress_lesson_id_idx ON user_progress(lesson_id);
```

### 6. Таблица `settings`
```sql
CREATE TABLE IF NOT EXISTS settings (
  id TEXT PRIMARY KEY,
  value TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## RLS (Row Level Security) Политики

### Для таблицы `profiles`
```sql
-- Включаем RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Пользователи могут видеть свои профили
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Пользователи могут обновлять свои профили
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Администраторы могут видеть все профили
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'Admin'
    )
  );

-- Администраторы могут обновлять все профили
CREATE POLICY "Admins can update all profiles"
  ON profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'Admin'
    )
  );
```

### Для таблицы `courses`
```sql
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;

-- Все аутентифицированные пользователи могут видеть курсы
CREATE POLICY "Authenticated users can view courses"
  ON courses FOR SELECT
  USING (auth.role() = 'authenticated');

-- Только администраторы могут создавать/обновлять/удалять курсы
CREATE POLICY "Admins can manage courses"
  ON courses FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'Admin'
    )
  );
```

### Для таблицы `modules`
```sql
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view modules"
  ON modules FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage modules"
  ON modules FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'Admin'
    )
  );
```

### Для таблицы `lessons`
```sql
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view lessons"
  ON lessons FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage lessons"
  ON lessons FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'Admin'
    )
  );
```

### Для таблицы `user_progress`
```sql
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own progress"
  ON user_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own progress"
  ON user_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

### Для таблицы `settings`
```sql
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view settings"
  ON settings FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage settings"
  ON settings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'Admin'
    )
  );
```

## Функции

### Функция для автоматического создания профиля при регистрации
```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role, avatar)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'Student'),
    COALESCE(
      NEW.raw_user_meta_data->>'avatar',
      'https://ui-avatars.com/api/?name=' || encode_uri_component(COALESCE(NEW.raw_user_meta_data->>'name', 'User')) || '&background=random'
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Триггер для автоматического создания профиля
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### Функция для увеличения XP
```sql
CREATE OR REPLACE FUNCTION increment_xp(x_val INTEGER)
RETURNS void AS $$
BEGIN
  UPDATE profiles
  SET xp = xp + x_val,
      level = FLOOR((xp + x_val) / 100) + 1
  WHERE id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## Storage Buckets

Создайте следующие бакеты в Storage:

1. **images** - для обложек курсов и логотипов
   - Public: Да
   - File size limit: 10MB
   - Allowed MIME types: image/jpeg, image/png, image/gif, image/webp

2. **covers** - для обложек курсов (альтернативный)
   - Public: Да
   - File size limit: 10MB
   - Allowed MIME types: image/jpeg, image/png, image/gif, image/webp

3. **videos** - для видеоуроков
   - Public: Да
   - File size limit: 100MB
   - Allowed MIME types: video/mp4, video/webm, video/ogg

4. **avatars** - для аватаров пользователей
   - Public: Да
   - File size limit: 5MB
   - Allowed MIME types: image/jpeg, image/png, image/gif, image/webp

## Политики Storage

Для каждого бакета создайте политики:

```sql
-- Политика для чтения (публичный доступ)
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'images' OR bucket_id = 'covers' OR bucket_id = 'videos' OR bucket_id = 'avatars');

-- Политика для загрузки (только для аутентифицированных)
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
WITH CHECK (
  auth.role() = 'authenticated' AND
  (bucket_id = 'images' OR bucket_id = 'covers' OR bucket_id = 'videos' OR bucket_id = 'avatars')
);

-- Политика для удаления (только для администраторов)
CREATE POLICY "Admins can delete"
ON storage.objects FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'Admin'
  ) AND
  (bucket_id = 'images' OR bucket_id = 'covers' OR bucket_id = 'videos' OR bucket_id = 'avatars')
);
```

## Настройка администратора

После создания первого пользователя, установите его как администратора:

```sql
-- Замените 'your-admin-email@example.com' на email вашего администратора
UPDATE profiles
SET role = 'Admin', is_approved = true
WHERE email = 'your-admin-email@example.com';
```

Или через метаданные при регистрации:
- Email: `knazar002@gmail.com` (уже настроен в коде как админ)

## Проверка

После настройки проверьте:

1. ✅ Таблицы созданы
2. ✅ RLS политики включены
3. ✅ Storage бакеты созданы
4. ✅ Политики Storage настроены
5. ✅ Администратор назначен
6. ✅ Функции работают

Если возникают проблемы с доступом к пользователям, проверьте:
- RLS политики для таблицы `profiles`
- Роль пользователя в таблице `profiles`
- Email администратора в коде (`contexts/AuthContext.tsx`)
