-- ============================================
-- ПОЛНЫЙ SQL СКРИПТ ДЛЯ SUPABASE
-- Скопируйте весь этот код и вставьте в SQL Editor в Supabase
-- ============================================

-- 1. СОЗДАНИЕ ТАБЛИЦ
-- ============================================

-- Таблица profiles
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

-- Индексы для profiles
CREATE INDEX IF NOT EXISTS profiles_email_idx ON profiles(email);
CREATE INDEX IF NOT EXISTS profiles_role_idx ON profiles(role);

-- Таблица courses
CREATE TABLE IF NOT EXISTS courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  cover_image TEXT,
  type TEXT DEFAULT 'Course',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица modules
CREATE TABLE IF NOT EXISTS modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS modules_course_id_idx ON modules(course_id);

-- Таблица lessons
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

-- Таблица user_progress
CREATE TABLE IF NOT EXISTS user_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, lesson_id)
);

CREATE INDEX IF NOT EXISTS user_progress_user_id_idx ON user_progress(user_id);
CREATE INDEX IF NOT EXISTS user_progress_lesson_id_idx ON user_progress(lesson_id);

-- Таблица settings
CREATE TABLE IF NOT EXISTS settings (
  id TEXT PRIMARY KEY,
  value TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. ВКЛЮЧЕНИЕ RLS (Row Level Security)
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- 3. УДАЛЕНИЕ СТАРЫХ ПОЛИТИК (если есть)
-- ============================================

DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Authenticated users can view courses" ON courses;
DROP POLICY IF EXISTS "Admins can manage courses" ON courses;
DROP POLICY IF EXISTS "Authenticated users can view modules" ON modules;
DROP POLICY IF EXISTS "Admins can manage modules" ON modules;
DROP POLICY IF EXISTS "Authenticated users can view lessons" ON lessons;
DROP POLICY IF EXISTS "Admins can manage lessons" ON lessons;
DROP POLICY IF EXISTS "Users can view own progress" ON user_progress;
DROP POLICY IF EXISTS "Users can insert own progress" ON user_progress;
DROP POLICY IF EXISTS "Everyone can view settings" ON settings;
DROP POLICY IF EXISTS "Admins can manage settings" ON settings;

-- 4. СОЗДАНИЕ RLS ПОЛИТИК
-- ============================================

-- Функция для проверки роли администратора (без рекурсии)
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = user_id
    AND role = 'Admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Политики для profiles
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (
    auth.uid() = id OR  -- Пользователь может видеть свой профиль
    is_admin(auth.uid())  -- Или если он администратор
  );

CREATE POLICY "Admins can update all profiles"
  ON profiles FOR UPDATE
  USING (
    auth.uid() = id OR  -- Пользователь может обновлять свой профиль
    is_admin(auth.uid())  -- Или если он администратор
  );

-- Политики для courses
CREATE POLICY "Authenticated users can view courses"
  ON courses FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage courses"
  ON courses FOR ALL
  USING (is_admin(auth.uid()));

-- Политики для modules
CREATE POLICY "Authenticated users can view modules"
  ON modules FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage modules"
  ON modules FOR ALL
  USING (is_admin(auth.uid()));

-- Политики для lessons
CREATE POLICY "Authenticated users can view lessons"
  ON lessons FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage lessons"
  ON lessons FOR ALL
  USING (is_admin(auth.uid()));

-- Политики для user_progress
CREATE POLICY "Users can view own progress"
  ON user_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own progress"
  ON user_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Политики для settings
CREATE POLICY "Everyone can view settings"
  ON settings FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage settings"
  ON settings FOR ALL
  USING (is_admin(auth.uid()));

-- 5. СОЗДАНИЕ ФУНКЦИЙ
-- ============================================

-- Функция для автоматического создания профиля при регистрации
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
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Функция для увеличения XP
CREATE OR REPLACE FUNCTION increment_xp(x_val INTEGER)
RETURNS void AS $$
BEGIN
  UPDATE profiles
  SET xp = xp + x_val,
      level = FLOOR((xp + x_val) / 100) + 1
  WHERE id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. СОЗДАНИЕ ТРИГГЕРОВ
-- ============================================

-- Удаляем старый триггер если есть
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Создаем триггер для автоматического создания профиля
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 7. СОЗДАНИЕ STORAGE BUCKETS (через SQL нельзя, но создадим политики)
-- ============================================
-- ВАЖНО: Сначала создайте бакеты вручную в Storage:
-- 1. images (public, 10MB, image/*)
-- 2. covers (public, 10MB, image/*)
-- 3. videos (public, 100MB, video/*)
-- 4. avatars (public, 5MB, image/*)

-- Удаляем старые политики Storage если есть
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete" ON storage.objects;

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

-- Политика для обновления (только для аутентифицированных)
CREATE POLICY "Authenticated users can update"
ON storage.objects FOR UPDATE
USING (
  auth.role() = 'authenticated' AND
  (bucket_id = 'images' OR bucket_id = 'covers' OR bucket_id = 'videos' OR bucket_id = 'avatars')
);

-- Политика для удаления (только для администраторов)
CREATE POLICY "Admins can delete"
ON storage.objects FOR DELETE
USING (
  is_admin(auth.uid()) AND
  (bucket_id = 'images' OR bucket_id = 'covers' OR bucket_id = 'videos' OR bucket_id = 'avatars')
);

-- 8. НАСТРОЙКА АДМИНИСТРАТОРА (замените email на свой)
-- ============================================

-- Если у вас уже есть пользователь, обновите его роль:
-- UPDATE profiles SET role = 'Admin', is_approved = true WHERE email = 'knazar002@gmail.com';

-- Или создайте администратора вручную после регистрации через приложение

-- 9. ИНИЦИАЛИЗАЦИЯ НАСТРОЕК
-- ============================================

INSERT INTO settings (id, value) VALUES ('logo_url', '')
ON CONFLICT (id) DO NOTHING;

INSERT INTO settings (id, value) VALUES ('school_name', 'Kiddy IT Academy')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- ГОТОВО! 
-- После выполнения скрипта:
-- 1. Создайте Storage бакеты вручную (images, covers, videos, avatars)
-- 2. Установите администратора через UPDATE запрос выше
-- ============================================
