-- ============================================
-- УДАЛЕНИЕ ПОЛЬЗОВАТЕЛЯ АДМИНОМ (из приложения и БД)
-- Выполните в Supabase → SQL Editor.
-- Удаляются: homework_submissions, user_progress, профиль.
-- Чтобы удалить и из Auth (полностью), после вызова RPC удалите пользователя
-- вручную: Authentication → Users → выберите пользователя → Delete.
-- ============================================

CREATE OR REPLACE FUNCTION delete_user_by_admin(target_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_admin_user() THEN
    RAISE EXCEPTION 'Access denied. Admin only.';
  END IF;

  IF target_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'target_user_id required');
  END IF;

  -- Запрет удалять самого себя (по id текущего пользователя)
  IF target_user_id = auth.uid() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Cannot delete yourself');
  END IF;

  -- Удаляем в порядке зависимостей (FK)
  DELETE FROM homework_submissions WHERE user_id = target_user_id;
  DELETE FROM user_progress WHERE user_id = target_user_id;
  DELETE FROM profiles WHERE id = target_user_id;

  RETURN jsonb_build_object('ok', true);
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('ok', false, 'error', SQLERRM);
END;
$$;

-- ============================================
-- Готово. В админке можно вызывать: supabase.rpc('delete_user_by_admin', { target_user_id: 'uuid' })
-- Для полного удаления из Auth: Supabase Dashboard → Authentication → Users → Delete.
-- ============================================
