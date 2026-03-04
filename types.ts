
export enum Role {
  STUDENT = 'Student',
  PARENT = 'Parent',
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

export interface Course {
  id: string;
  type: CourseType;
  title: string;
  description: string;
  progress: number;
  modules: Module[];
  nextLessonId: string;
  coverImage: string;
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
