-- ============================================
-- ПОЛНОЕ УДАЛЕНИЕ ВСЕХ ТАБЛИЦ
-- Выполните этот скрипт ПЕРЕД supabase_complete_reset.sql
-- ============================================

-- Удаляем все функции (они могут существовать независимо от таблиц)
DROP FUNCTION IF EXISTS is_admin(UUID) CASCADE;
DROP FUNCTION IF EXISTS is_admin_simple(UUID) CASCADE;
DROP FUNCTION IF EXISTS is_admin_check() CASCADE;
DROP FUNCTION IF EXISTS increment_xp(INTEGER) CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;

-- Удаляем все триггеры (проверяем существование таблиц)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
        DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
    END IF;
END $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Удаляем все политики (проверяем существование таблиц)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
        DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
        DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
        DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
        DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'courses') THEN
        DROP POLICY IF EXISTS "Authenticated users can view courses" ON courses;
        DROP POLICY IF EXISTS "Admins can manage courses" ON courses;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'modules') THEN
        DROP POLICY IF EXISTS "Authenticated users can view modules" ON modules;
        DROP POLICY IF EXISTS "Admins can manage modules" ON modules;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'lessons') THEN
        DROP POLICY IF EXISTS "Authenticated users can view lessons" ON lessons;
        DROP POLICY IF EXISTS "Admins can manage lessons" ON lessons;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_progress') THEN
        DROP POLICY IF EXISTS "Users can view own progress" ON user_progress;
        DROP POLICY IF EXISTS "Users can insert own progress" ON user_progress;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'settings') THEN
        DROP POLICY IF EXISTS "Everyone can view settings" ON settings;
        DROP POLICY IF EXISTS "Admins can manage settings" ON settings;
    END IF;
END $$;

DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete" ON storage.objects;

-- Удаляем все таблицы С CASCADE (удалит все зависимости)
DROP TABLE IF EXISTS user_progress CASCADE;
DROP TABLE IF EXISTS lessons CASCADE;
DROP TABLE IF EXISTS modules CASCADE;
DROP TABLE IF EXISTS courses CASCADE;
DROP TABLE IF EXISTS settings CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS homeworks CASCADE;

-- Удаляем ВСЕ таблицы из public схемы (на всякий случай)
-- Это удалит любые другие таблицы, которые могли остаться
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename NOT LIKE 'pg_%') 
    LOOP
        EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
    END LOOP;
END $$;

-- Проверяем, что все удалено (этот запрос должен вернуть пустой результат)
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('profiles', 'courses', 'modules', 'lessons', 'user_progress', 'settings');
