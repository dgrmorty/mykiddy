-- 500 XP за уровень (раньше в RPC использовалось 100).
-- Пересчёт level у всех профилей и обновление increment_xp.

UPDATE public.profiles
SET level = (GREATEST(COALESCE(xp, 0), 0) / 500) + 1;

CREATE OR REPLACE FUNCTION public.increment_xp(x_val integer)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $function$
BEGIN
  UPDATE public.profiles
  SET
    xp = COALESCE(xp, 0) + x_val,
    level = (GREATEST(COALESCE(xp, 0) + x_val, 0) / 500) + 1
  WHERE id = auth.uid();
END;
$function$;
