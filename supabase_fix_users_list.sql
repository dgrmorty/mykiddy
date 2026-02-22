-- ============================================
-- ИСПРАВЛЕНИЕ: все пользователи видны в админке (в т.ч. только что зарегистрированные)
-- Причина: в PostgreSQL нет encode_uri_component, из-за этого падал триггер
-- и не создавался профиль, а RPC get_all_users не работал.
-- Выполните этот скрипт в Supabase → SQL Editor.
-- ============================================

-- 1. Триггер создания профиля БЕЗ encode_uri_component (используем первую букву имени для аватарки)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_name TEXT;
  avatar_letter TEXT;
BEGIN
  user_name := COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1));
  avatar_letter := COALESCE(left(trim(user_name), 1), 'U');
  IF avatar_letter = '' THEN avatar_letter := 'U'; END IF;

  INSERT INTO public.profiles (id, email, name, role, avatar)
  VALUES (
    NEW.id,
    NEW.email,
    user_name,
    COALESCE(NEW.raw_user_meta_data->>'role', 'Student'),
    COALESCE(
      NEW.raw_user_meta_data->>'avatar',
      'https://ui-avatars.com/api/?name=' || avatar_letter || '&background=random'
    )
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user error for %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. RPC get_all_users БЕЗ encode_uri_component (чтобы админка показывала всех из auth.users)
CREATE OR REPLACE FUNCTION get_all_users()
RETURNS TABLE (
  id UUID,
  email TEXT,
  name TEXT,
  role TEXT,
  avatar TEXT,
  level INTEGER,
  xp INTEGER,
  is_approved BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_admin_user() THEN
    RAISE EXCEPTION 'Access denied. Admin only.';
  END IF;

  RETURN QUERY
  SELECT
    au.id,
    COALESCE(p.email, au.email)::TEXT as email,
    COALESCE(p.name, au.raw_user_meta_data->>'name', split_part(au.email, '@', 1))::TEXT as name,
    COALESCE(p.role, au.raw_user_meta_data->>'role', 'Student')::TEXT as role,
    COALESCE(
      p.avatar,
      au.raw_user_meta_data->>'avatar',
      'https://ui-avatars.com/api/?name=' || COALESCE(left(trim(COALESCE(p.name, split_part(au.email, '@', 1))), 1), 'U') || '&background=random'
    )::TEXT as avatar,
    COALESCE(p.level, 1)::INTEGER as level,
    COALESCE(p.xp, 0)::INTEGER as xp,
    COALESCE(p.is_approved, false)::BOOLEAN as is_approved,
    COALESCE(p.created_at, au.created_at) as created_at
  FROM auth.users au
  LEFT JOIN profiles p ON au.id = p.id
  ORDER BY COALESCE(p.created_at, au.created_at) DESC NULLS LAST;
END;
$$;

-- 3. Для уже зарегистрированных пользователей без профиля — создаём записи в profiles
INSERT INTO public.profiles (id, email, name, role, avatar, level, xp, is_approved)
SELECT
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'name', split_part(au.email, '@', 1)),
  COALESCE(au.raw_user_meta_data->>'role', 'Student'),
  'https://ui-avatars.com/api/?name=U&background=random',
  1,
  0,
  false
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- ГОТОВО. Обновите страницу админки «Пользователи».
-- ============================================
