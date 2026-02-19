-- ============================================
-- ДОБАВЛЕНИЕ ОТСЛЕЖИВАНИЯ РЕШЕННЫХ ДЗ
-- Выполните этот скрипт в Supabase SQL Editor
-- ============================================

-- Создаем таблицу для отслеживания решенных домашних заданий
CREATE TABLE IF NOT EXISTS homework_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  xp_awarded INTEGER DEFAULT 0,
  UNIQUE(user_id, lesson_id)
);

CREATE INDEX homework_submissions_user_id_idx ON homework_submissions(user_id);
CREATE INDEX homework_submissions_lesson_id_idx ON homework_submissions(lesson_id);

-- Включаем RLS
ALTER TABLE homework_submissions ENABLE ROW LEVEL SECURITY;

-- Политики для homework_submissions
CREATE POLICY "Users can view own submissions"
  ON homework_submissions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own submissions"
  ON homework_submissions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- ГОТОВО!
-- ============================================
