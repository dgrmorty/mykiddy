-- ============================================
-- ИСПРАВЛЕНИЕ RLS ПОЛИТИК ДЛЯ PROFILES
-- Выполните этот скрипт в SQL Editor Supabase
-- ============================================

-- Удаляем старые политики с рекурсией
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;

-- Создаем функцию для проверки роли администратора (без рекурсии)
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

-- Новая политика для просмотра всех профилей администраторами
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (
    auth.uid() = id OR  -- Пользователь может видеть свой профиль
    is_admin(auth.uid())  -- Или если он администратор
  );

-- Новая политика для обновления всех профилей администраторами
CREATE POLICY "Admins can update all profiles"
  ON profiles FOR UPDATE
  USING (
    auth.uid() = id OR  -- Пользователь может обновлять свой профиль
    is_admin(auth.uid())  -- Или если он администратор
  );

-- Также исправляем политики для других таблиц, чтобы использовать функцию
DROP POLICY IF EXISTS "Admins can manage courses" ON courses;
DROP POLICY IF EXISTS "Admins can manage modules" ON modules;
DROP POLICY IF EXISTS "Admins can manage lessons" ON lessons;
DROP POLICY IF EXISTS "Admins can manage settings" ON settings;

CREATE POLICY "Admins can manage courses"
  ON courses FOR ALL
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can manage modules"
  ON modules FOR ALL
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can manage lessons"
  ON lessons FOR ALL
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can manage settings"
  ON settings FOR ALL
  USING (is_admin(auth.uid()));

-- Исправляем политику Storage для удаления
DROP POLICY IF EXISTS "Admins can delete" ON storage.objects;

CREATE POLICY "Admins can delete"
ON storage.objects FOR DELETE
USING (
  is_admin(auth.uid()) AND
  (bucket_id = 'images' OR bucket_id = 'covers' OR bucket_id = 'videos' OR bucket_id = 'avatars')
);
