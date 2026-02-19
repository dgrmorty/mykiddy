-- ============================================
-- ФИНАЛЬНАЯ НАСТРОЙКА БАЗЫ ДАННЫХ
-- Создает все таблицы, политики, функции БЕЗ рекурсии
-- Выполните этот скрипт в SQL Editor Supabase
-- ============================================

-- ШАГ 1: СОЗДАНИЕ ТАБЛИЦ
-- ============================================

-- Таблица profiles
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  name TEXT,
  role TEXT DEFAULT 'Student',
  avatar TEXT,
  level INTEGER DEFAULT 1,
  xp INTEGER DEFAULT 0,
  is_approved BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX profiles_email_idx ON profiles(email);
CREATE INDEX profiles_role_idx ON profiles(role);

-- Таблица courses
CREATE TABLE courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  cover_image TEXT,
  type TEXT DEFAULT 'Course',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица modules
CREATE TABLE modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX modules_course_id_idx ON modules(course_id);

-- Таблица lessons
CREATE TABLE lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID REFERENCES modules(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  video_url TEXT,
  homework_task TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX lessons_module_id_idx ON lessons(module_id);

-- Таблица user_progress
CREATE TABLE user_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, lesson_id)
);

CREATE INDEX user_progress_user_id_idx ON user_progress(user_id);
CREATE INDEX user_progress_lesson_id_idx ON user_progress(lesson_id);

-- Таблица settings
CREATE TABLE settings (
  id TEXT PRIMARY KEY,
  value TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ШАГ 2: ВКЛЮЧЕНИЕ RLS
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- ШАГ 3: СОЗДАНИЕ ФУНКЦИЙ (ПЕРЕД политиками!)
-- ============================================

-- Функция для проверки админа БЕЗ рекурсии (проверяет email из auth.users, НЕ из profiles!)
CREATE OR REPLACE FUNCTION is_admin_user()
RETURNS BOOLEAN AS $$
BEGIN
  -- Проверяем email напрямую из auth.users (не вызывает RLS и не вызывает рекурсию)
  RETURN EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
    AND email = 'knazar002@gmail.com'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Функция для автоматического создания профиля при регистрации
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role, avatar)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'Student'),
    COALESCE(
      NEW.raw_user_meta_data->>'avatar',
      'https://ui-avatars.com/api/?name=' || encode_uri_component(COALESCE(NEW.raw_user_meta_data->>'name', 'User')) || '&background=random'
    )
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Функция для увеличения XP
CREATE OR REPLACE FUNCTION increment_xp(x_val INTEGER)
RETURNS void AS $$
BEGIN
  UPDATE profiles
  SET xp = xp + x_val,
      level = FLOOR((xp + x_val) / 1000) + 1
  WHERE id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Функция для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ШАГ 4: СОЗДАНИЕ RLS ПОЛИТИК (БЕЗ РЕКУРСИИ!)
-- ============================================

-- PROFILES: Все аутентифицированные могут видеть профили (для лидерборда)
-- Пользователи могут обновлять ТОЛЬКО свои профили
-- Админы могут обновлять все профили
CREATE POLICY "Authenticated users can view profiles"
  ON profiles FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id OR is_admin_user());

-- COURSES: Все аутентифицированные могут видеть
CREATE POLICY "Authenticated users can view courses"
  ON courses FOR SELECT
  USING (auth.role() = 'authenticated');

-- Админы могут создавать, обновлять и удалять курсы
CREATE POLICY "Admins can manage courses"
  ON courses FOR ALL
  USING (is_admin_user());

-- MODULES: Все аутентифицированные могут видеть
CREATE POLICY "Authenticated users can view modules"
  ON modules FOR SELECT
  USING (auth.role() = 'authenticated');

-- Админы могут создавать, обновлять и удалять модули
CREATE POLICY "Admins can manage modules"
  ON modules FOR ALL
  USING (is_admin_user());

-- LESSONS: Все аутентифицированные могут видеть
CREATE POLICY "Authenticated users can view lessons"
  ON lessons FOR SELECT
  USING (auth.role() = 'authenticated');

-- Админы могут создавать, обновлять и удалять уроки
CREATE POLICY "Admins can manage lessons"
  ON lessons FOR ALL
  USING (is_admin_user());

-- USER_PROGRESS: Пользователи видят и добавляют только свой прогресс
CREATE POLICY "Users can view own progress"
  ON user_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own progress"
  ON user_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- SETTINGS: Все могут видеть
CREATE POLICY "Everyone can view settings"
  ON settings FOR SELECT
  USING (true);

-- Админы могут управлять настройками
CREATE POLICY "Admins can manage settings"
  ON settings FOR ALL
  USING (is_admin_user());

-- STORAGE: Публичный доступ для чтения, аутентифицированные могут загружать
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'images' OR bucket_id = 'covers' OR bucket_id = 'videos' OR bucket_id = 'avatars');

CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
WITH CHECK (
  auth.role() = 'authenticated' AND
  (bucket_id = 'images' OR bucket_id = 'covers' OR bucket_id = 'videos' OR bucket_id = 'avatars')
);

CREATE POLICY "Authenticated users can update"
ON storage.objects FOR UPDATE
USING (
  auth.role() = 'authenticated' AND
  (bucket_id = 'images' OR bucket_id = 'covers' OR bucket_id = 'videos' OR bucket_id = 'avatars')
);

CREATE POLICY "Admins can delete"
ON storage.objects FOR DELETE
USING (
  is_admin_user() AND
  (bucket_id = 'images' OR bucket_id = 'covers' OR bucket_id = 'videos' OR bucket_id = 'avatars')
);

-- ШАГ 5: СОЗДАНИЕ ТРИГГЕРОВ
-- ============================================

-- Триггер для автоматического создания профиля
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Триггер для автоматического обновления updated_at в profiles
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ШАГ 6: ИНИЦИАЛИЗАЦИЯ НАСТРОЕК
-- ============================================

INSERT INTO settings (id, value) VALUES ('logo_url', '')
ON CONFLICT (id) DO NOTHING;

INSERT INTO settings (id, value) VALUES ('school_name', 'Kiddy IT Academy')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- ГОТОВО!
-- 
-- ВАЖНО: 
-- - Админы управляют контентом через приложение (проверка email = 'knazar002@gmail.com' на клиенте)
-- - RLS политики простые и БЕЗ рекурсии
-- - Пользователи могут обновлять только свои профили
-- - Все аутентифицированные могут видеть курсы, модули и уроки
-- - Для создания/обновления/удаления курсов, модулей, уроков админы используют приложение
-- ============================================
