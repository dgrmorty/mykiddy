-- ============================================
-- ОКОНЧАТЕЛЬНОЕ ИСПРАВЛЕНИЕ РЕКУРСИИ RLS
-- Выполните этот скрипт в SQL Editor Supabase
-- ============================================

-- СНАЧАЛА удаляем все политики, которые используют старую функцию
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can manage courses" ON courses;
DROP POLICY IF EXISTS "Admins can manage modules" ON modules;
DROP POLICY IF EXISTS "Admins can manage lessons" ON lessons;
DROP POLICY IF EXISTS "Admins can manage settings" ON settings;
DROP POLICY IF EXISTS "Admins can delete" ON storage.objects;

-- ТЕПЕРЬ удаляем старую функцию
DROP FUNCTION IF EXISTS is_admin(UUID);

-- Создаем функцию для проверки роли администратора БЕЗ обращения к profiles
-- Используем auth.users напрямую, чтобы избежать рекурсии
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- Проверяем роль через user_metadata в auth.users (обходит RLS)
  SELECT COALESCE(
    (raw_user_meta_data->>'role')::TEXT,
    CASE 
      WHEN email = 'knazar002@gmail.com' THEN 'Admin'
      ELSE 'Student'
    END
  ) INTO user_role
  FROM auth.users
  WHERE id = user_id;
  
  -- Если не нашли в auth.users, проверяем profiles с отключенным RLS
  IF user_role IS NULL THEN
    SET LOCAL row_security = off;
    SELECT role INTO user_role
    FROM profiles
    WHERE id = user_id;
    SET LOCAL row_security = on;
  END IF;
  
  RETURN COALESCE(user_role, 'Student') = 'Admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Альтернативный вариант - более простой и надежный
-- Используем только проверку email и метаданных
CREATE OR REPLACE FUNCTION is_admin_simple(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Проверяем email напрямую из auth.users
  RETURN EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = user_id
    AND (
      email = 'knazar002@gmail.com'
      OR (raw_user_meta_data->>'role')::TEXT = 'Admin'
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Создаем новые политики с использованием простой функции
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (
    auth.uid() = id OR  -- Пользователь может видеть свой профиль
    is_admin_simple(auth.uid())  -- Или если он администратор
  );

CREATE POLICY "Admins can update all profiles"
  ON profiles FOR UPDATE
  USING (
    auth.uid() = id OR  -- Пользователь может обновлять свой профиль
    is_admin_simple(auth.uid())  -- Или если он администратор
  );

-- Создаем политики для других таблиц
CREATE POLICY "Admins can manage courses"
  ON courses FOR ALL
  USING (is_admin_simple(auth.uid()));

CREATE POLICY "Admins can manage modules"
  ON modules FOR ALL
  USING (is_admin_simple(auth.uid()));

CREATE POLICY "Admins can manage lessons"
  ON lessons FOR ALL
  USING (is_admin_simple(auth.uid()));

CREATE POLICY "Admins can manage settings"
  ON settings FOR ALL
  USING (is_admin_simple(auth.uid()));

CREATE POLICY "Admins can delete"
ON storage.objects FOR DELETE
USING (
  is_admin_simple(auth.uid()) AND
  (bucket_id = 'images' OR bucket_id = 'covers' OR bucket_id = 'videos' OR bucket_id = 'avatars')
);
