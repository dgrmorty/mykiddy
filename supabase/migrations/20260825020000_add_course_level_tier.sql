-- Library levels: junior / middle / senior / senior_plus
-- year_tier is kept for backward compatibility.

ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS level_tier text DEFAULT 'junior';

-- Backfill from year_tier: year_1 -> junior, year_2_plus -> middle.
-- Only rewrite missing or default-junior rows so a re-run does not clobber senior / senior_plus.
UPDATE public.courses
SET level_tier = 'middle'
WHERE year_tier = 'year_2_plus'
  AND (level_tier IS NULL OR level_tier = 'junior');

UPDATE public.courses
SET level_tier = 'junior'
WHERE level_tier IS NULL;

ALTER TABLE public.courses
  ALTER COLUMN level_tier SET DEFAULT 'junior';

ALTER TABLE public.courses
  ALTER COLUMN level_tier SET NOT NULL;

ALTER TABLE public.courses DROP CONSTRAINT IF EXISTS courses_level_tier_check;
ALTER TABLE public.courses ADD CONSTRAINT courses_level_tier_check
  CHECK (level_tier IN ('junior', 'middle', 'senior', 'senior_plus'));
