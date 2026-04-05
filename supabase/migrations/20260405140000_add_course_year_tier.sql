-- Год обучения: первый год или второй и далее (курсы в библиотеке фильтруются по этому полю)
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS year_tier text DEFAULT 'year_1';

UPDATE public.courses SET year_tier = 'year_1' WHERE year_tier IS NULL;

ALTER TABLE public.courses
  ALTER COLUMN year_tier SET DEFAULT 'year_1';

-- Опционально: ограничить допустимые значения (раскомментируйте, если нужно)
-- ALTER TABLE public.courses DROP CONSTRAINT IF EXISTS courses_year_tier_check;
-- ALTER TABLE public.courses ADD CONSTRAINT courses_year_tier_check
--   CHECK (year_tier IN ('year_1', 'year_2_plus'));
