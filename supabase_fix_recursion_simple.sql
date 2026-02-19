-- ============================================
-- ПРОСТОЕ И НАДЕЖНОЕ ИСПРАВЛЕНИЕ РЕКУРСИИ
-- Выполните этот скрипт в SQL Editor Supabase
-- ============================================

-- Удаляем ВСЕ политики, которые могут вызывать рекурсию
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can manage courses" ON courses;
DROP POLICY IF EXISTS "Admins can manage modules" ON modules;
DROP POLICY IF EXISTS "Admins can manage lessons" ON lessons;
DROP POLICY IF EXISTS "Admins can manage settings" ON settings;
DROP POLICY IF EXISTS "Admins can delete" ON storage.objects;

-- Удаляем старые функции
DROP FUNCTION IF EXISTS is_admin(UUID) CASCADE;
DROP FUNCTION IF EXISTS is_admin_simple(UUID) CASCADE;

-- Создаем ПРОСТУЮ функцию, которая проверяет email напрямую из auth.users
-- БЕЗ обращения к таблице profiles
CREATE OR REPLACE FUNCTION is_admin_check()
RETURNS BOOLEAN AS $$
BEGIN
  -- Проверяем email напрямую из auth.users (не вызывает RLS)
  RETURN EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
    AND email = 'knazar002@gmail.com'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Удаляем ВСЕ политики для profiles и создаем заново
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Политики для profiles - ТОЛЬКО для пользователей
-- Пользователи могут видеть и обновлять только свои профили
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- ВАЖНО: Политики для админов отключены, чтобы избежать рекурсии
-- Админы управляют через приложение (проверка email на клиенте)

-- Политики для courses - все аутентифицированные могут видеть
-- Админы управляют через приложение (service_role)
DROP POLICY IF EXISTS "Authenticated users can view courses" ON courses;
CREATE POLICY "Authenticated users can view courses"
  ON courses FOR SELECT
  USING (auth.role() = 'authenticated');

-- Политики для modules
DROP POLICY IF EXISTS "Authenticated users can view modules" ON modules;
CREATE POLICY "Authenticated users can view modules"
  ON modules FOR SELECT
  USING (auth.role() = 'authenticated');

-- Политики для lessons
DROP POLICY IF EXISTS "Authenticated users can view lessons" ON lessons;
CREATE POLICY "Authenticated users can view lessons"
  ON lessons FOR SELECT
  USING (auth.role() = 'authenticated');

-- Политики для settings - все могут видеть
DROP POLICY IF EXISTS "Everyone can view settings" ON settings;
CREATE POLICY "Everyone can view settings"
  ON settings FOR SELECT
  USING (true);

-- Политики для user_progress
DROP POLICY IF EXISTS "Users can view own progress" ON user_progress;
DROP POLICY IF EXISTS "Users can insert own progress" ON user_progress;

CREATE POLICY "Users can view own progress"
  ON user_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own progress"
  ON user_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Storage политики
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update" ON storage.objects;

CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'images' OR bucket_id = 'covers' OR bucket_id = 'videos' OR bucket_id = 'avatars');

CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
WITH CHECK (
  auth.role() = 'authenticated' AND
  (bucket_id = 'images' OR bucket_id = 'covers' OR bucket_id = 'videos' OR bucket_id = 'avatars')
);

CREATE POLICY "Authenticated users can update"
ON storage.objects FOR UPDATE
USING (
  auth.role() = 'authenticated' AND
  (bucket_id = 'images' OR bucket_id = 'covers' OR bucket_id = 'videos' OR bucket_id = 'avatars')
);
