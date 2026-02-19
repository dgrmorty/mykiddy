-- ============================================
-- ИСПРАВЛЕНИЕ ПРОФИЛЕЙ И RLS ПОЛИТИК
-- Выполните этот скрипт в Supabase SQL Editor
-- ============================================

-- 1. Исправляем политику UPDATE для profiles (добавляем WITH CHECK)
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 2. УДАЛЯЕМ политику INSERT - функция handle_new_user() с SECURITY DEFINER обходит RLS
-- Политика INSERT не нужна для функции, но нужна для ручного создания профилей
-- Оставляем политику для ручного создания, но функция все равно обойдет RLS
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

-- Политика для ручного создания профилей (если нужно)
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- 3. Исправляем функцию increment_xp (100 XP = 1 уровень)
CREATE OR REPLACE FUNCTION increment_xp(x_val INTEGER)
RETURNS void AS $$
BEGIN
  UPDATE profiles
  SET xp = xp + x_val,
      level = FLOOR((xp + x_val) / 100) + 1
  WHERE id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Исправляем политику SELECT для profiles (чтобы все видели профили для лидерборда)
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON profiles;

CREATE POLICY "Authenticated users can view profiles"
  ON profiles FOR SELECT
  USING (auth.role() = 'authenticated');

-- 5. ИСПРАВЛЯЕМ ФУНКЦИЮ СОЗДАНИЯ ПРОФИЛЯ
-- Используем SECURITY DEFINER для обхода RLS
-- В Supabase функции с SECURITY DEFINER автоматически обходят RLS
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_name TEXT;
  user_email TEXT;
BEGIN
  -- Получаем данные из NEW
  user_email := COALESCE(NEW.email, '');
  user_name := COALESCE(
    NEW.raw_user_meta_data->>'name', 
    split_part(user_email, '@', 1)
  );
  
  -- Вставляем профиль (SECURITY DEFINER обходит RLS)
  INSERT INTO public.profiles (
    id, 
    email, 
    name, 
    role, 
    avatar, 
    level, 
    xp, 
    is_approved
  )
  VALUES (
    NEW.id,
    user_email,
    user_name,
    COALESCE(NEW.raw_user_meta_data->>'role', 'Student'),
    COALESCE(
      NEW.raw_user_meta_data->>'avatar',
      'https://ui-avatars.com/api/?name=' || encode_uri_component(user_name) || '&background=random'
    ),
    1,   -- level по умолчанию
    0,   -- xp по умолчанию
    true -- is_approved по умолчанию
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Логируем ошибку, но не прерываем создание пользователя
    RAISE WARNING 'Error creating profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- 6. Убеждаемся, что триггер создан
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- ГОТОВО!
-- ============================================
