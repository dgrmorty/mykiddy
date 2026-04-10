-- Слойный SVG-аватар убран; достаточно profiles.avatar (файл, в т.ч. сгенерированный).
alter table public.profiles drop column if exists avatar_cosmetic;
