-- Детерминированный ранг в лидерборде по XP (при равенстве XP — по id).
-- Нужен для значков «Созвездие» / «Монарх» и корректного места у всех пользователей, не только топ-200.

CREATE OR REPLACE FUNCTION public.profile_xp_rank(target uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (sub.rnk)::integer
  FROM (
    SELECT
      id,
      row_number() OVER (ORDER BY COALESCE(xp, 0) DESC, id ASC) AS rnk
    FROM public.profiles
  ) sub
  WHERE sub.id = target;
$$;

REVOKE ALL ON FUNCTION public.profile_xp_rank(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.profile_xp_rank(uuid) TO authenticated;
