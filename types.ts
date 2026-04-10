import type { AvatarEquipMap } from './data/avatarCatalog';

export enum Role {
  STUDENT = 'Student',
  PARENT = 'Parent',
  TEACHER = 'Teacher',
  GUEST = 'Guest',
  ADMIN = 'Admin'
}

export enum CourseType {
  PYTHON = 'Python Мастер',
  WEB = 'Web Архитектор',
  ROBOTICS = 'Робототехника Core',
  DESIGN = '3D Дизайн'
}

export interface User {
  id: string;
  email?: string;
  name: string;
  role: Role;
  avatar: string;
  level: number;
  xp: number;
  isApproved: boolean;
  /** Серия дней активности (UTC), из profiles */
  streakCurrent?: number;
  streakLongest?: number;
  /** Слои аватара-программиста (ученики), из profiles.avatar_cosmetic */
  avatarCosmetic?: AvatarEquipMap;
}

export interface Lesson {
  id: string;
  moduleId: string;
  title: string;
  description: string;
  duration: string;
  videoUrl?: string;
  isCompleted: boolean;
  codeSnippet?: string;
  locked: boolean;
  upcomingDate?: string;
  homeworkTask?: string;
}

export interface Module {
  id: string;
  title: string;
  progress: number;
  totalLessons: number;
  lessons: Lesson[];
}

/** Год занятий: первый год обучения или второй и далее */
export type CourseYearTier = 'year_1' | 'year_2_plus';

export const COURSE_YEAR_LABELS: Record<CourseYearTier, string> = {
  year_1: '1-й год',
  year_2_plus: '2+ год занятий',
};

export function normalizeCourseYearTier(value: unknown): CourseYearTier {
  return value === 'year_2_plus' ? 'year_2_plus' : 'year_1';
}

export interface Course {
  id: string;
  type: CourseType;
  title: string;
  description: string;
  progress: number;
  modules: Module[];
  nextLessonId: string;
  coverImage: string;
  /** Из колонки courses.year_tier в Supabase */
  yearTier: CourseYearTier;
  created_at?: string;
}

export interface Stat {
  label: string;
  value: string | number;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
}

export interface UserProgress {
  lesson_id: string;
  completed_at: string;
}

export interface ScheduleEvent {
  id: string;
  day_of_week: number; // 1=Пн ... 7=Вс
  time_start: string;
  time_end?: string;
  title: string;
  description?: string;
  location?: string;
  sort_order?: number;
}
