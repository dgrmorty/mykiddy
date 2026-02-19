-- ============================================
-- ФИНАЛЬНОЕ ИСПРАВЛЕНИЕ ВСЕХ RLS ПОЛИТИК
-- Выполните этот скрипт в SQL Editor Supabase
-- ============================================

-- ШАГ 1: Удаляем ВСЕ старые политики
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

DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete" ON storage.objects;

-- ШАГ 2: Удаляем все функции
DROP FUNCTION IF EXISTS is_admin(UUID) CASCADE;
DROP FUNCTION IF EXISTS is_admin_simple(UUID) CASCADE;
DROP FUNCTION IF EXISTS is_admin_check() CASCADE;

-- ШАГ 3: Создаем новые простые политики БЕЗ рекурсии

-- PROFILES: Только пользователи могут видеть и обновлять свои профили
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- COURSES: Все аутентифицированные могут видеть, админы управляют через приложение
CREATE POLICY "Authenticated users can view courses"
  ON courses FOR SELECT
  USING (auth.role() = 'authenticated');

-- MODULES: Все аутентифицированные могут видеть
CREATE POLICY "Authenticated users can view modules"
  ON modules FOR SELECT
  USING (auth.role() = 'authenticated');

-- LESSONS: Все аутентифицированные могут видеть
CREATE POLICY "Authenticated users can view lessons"
  ON lessons FOR SELECT
  USING (auth.role() = 'authenticated');

-- USER_PROGRESS: Пользователи видят и добавляют только свой прогресс
CREATE POLICY "Users can view own progress"
  ON user_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own progress"
  ON user_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- SETTINGS: Все могут видеть
CREATE POLICY "Everyone can view settings"
  ON settings FOR SELECT
  USING (true);

-- STORAGE: Публичный доступ для чтения, аутентифицированные могут загружать
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

-- ВАЖНО: Для админов (создание/обновление/удаление курсов, модулей, уроков, профилей)
-- используется проверка на клиенте (email = 'knazar002@gmail.com')
-- и операции выполняются через anon key, но с проверкой роли в приложении
