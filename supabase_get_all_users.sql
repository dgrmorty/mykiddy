-- ============================================
-- ФУНКЦИЯ ДЛЯ ПОЛУЧЕНИЯ ВСЕХ ПОЛЬЗОВАТЕЛЕЙ (ДЛЯ АДМИНОВ)
-- Выполните этот скрипт в Supabase SQL Editor
-- ============================================

-- Создаем функцию, которая возвращает всех пользователей из auth.users
-- с объединением данных из profiles
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
  -- Проверяем, что пользователь - админ
  IF NOT is_admin_user() THEN
    RAISE EXCEPTION 'Access denied. Admin only.';
  END IF;
  
  -- Возвращаем всех пользователей из auth.users с данными из profiles
  RETURN QUERY
  SELECT 
    au.id,
    COALESCE(p.email, au.email) as email,
    COALESCE(p.name, au.raw_user_meta_data->>'name', split_part(au.email, '@', 1)) as name,
    COALESCE(p.role, au.raw_user_meta_data->>'role', 'Student')::TEXT as role,
    COALESCE(
      p.avatar,
      au.raw_user_meta_data->>'avatar',
      'https://ui-avatars.com/api/?name=' || encode_uri_component(COALESCE(p.name, split_part(au.email, '@', 1))) || '&background=random'
    ) as avatar,
    COALESCE(p.level, 1) as level,
    COALESCE(p.xp, 0) as xp,
    COALESCE(p.is_approved, false) as is_approved,
    COALESCE(p.created_at, au.created_at) as created_at
  FROM auth.users au
  LEFT JOIN profiles p ON au.id = p.id
  ORDER BY COALESCE(p.created_at, au.created_at) DESC;
END;
$$;

-- ============================================
-- ГОТОВО!
-- Теперь админы могут вызывать эту функцию через supabase.rpc('get_all_users')
-- ============================================
