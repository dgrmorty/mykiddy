-- ============================================
-- ПОЛНОЕ УДАЛЕНИЕ ВСЕХ ТАБЛИЦ
-- Выполните этот скрипт ПЕРЕД supabase_complete_reset.sql
-- ============================================

-- Удаляем все политики
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

-- Удаляем все функции
DROP FUNCTION IF EXISTS is_admin(UUID) CASCADE;
DROP FUNCTION IF EXISTS is_admin_simple(UUID) CASCADE;
DROP FUNCTION IF EXISTS is_admin_check() CASCADE;
DROP FUNCTION IF EXISTS increment_xp(INTEGER) CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;

-- Удаляем все триггеры
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;

-- Удаляем все таблицы С CASCADE (удалит все зависимости)
DROP TABLE IF EXISTS user_progress CASCADE;
DROP TABLE IF EXISTS lessons CASCADE;
DROP TABLE IF EXISTS modules CASCADE;
DROP TABLE IF EXISTS courses CASCADE;
DROP TABLE IF EXISTS settings CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- Проверяем, что все удалено (этот запрос должен вернуть пустой результат)
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('profiles', 'courses', 'modules', 'lessons', 'user_progress', 'settings');
