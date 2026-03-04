import { supabase } from './supabase';
import { Course } from '../types';
import { withTimeout } from '../utils/withTimeout';

const CACHE_TTL_MS = 90 * 1000;
const FETCH_TIMEOUT_MS = 8000; // 8 с для медленного интернета

let coursesCache: { key: string; data: Course[]; ts: number } | null = null;

function getCachedCourses(userId?: string): Course[] | null {
  if (!coursesCache) return null;
  const key = userId || 'guest';
  if (coursesCache.key !== key || Date.now() - coursesCache.ts > CACHE_TTL_MS) return null;
  return coursesCache.data;
}

function setCachedCourses(userId: string | undefined, data: Course[]) {
  coursesCache = { key: userId || 'guest', data, ts: Date.now() };
}

export function invalidateCoursesCache() {
  coursesCache = null;
}

/** Ошибка загрузки курсов (таймаут или сбой БД) — показывать «Не удалось загрузить. Повторите позже.» */
export class CoursesLoadError extends Error {
  constructor(message: string = 'Не удалось загрузить курсы. Повторите позже.') {
    super(message);
    this.name = 'CoursesLoadError';
  }
}

export const contentService = {
  async getCourses(userId?: string): Promise<Course[]> {
    const cached = getCachedCourses(userId);
    if (cached) return cached;

    const dbRequest = supabase
      .from('courses')
      .select(`
        *,
        modules (
          *,
          lessons (*)
        )
      `)
      .order('created_at', { ascending: true });

    const result: any = await withTimeout(
      dbRequest as unknown as Promise<unknown>,
      FETCH_TIMEOUT_MS,
      'Courses fetch'
    ).catch((e) => {
      console.error('[ContentService] Timeout or network error:', e);
      throw new CoursesLoadError();
    });

    const { data: dbCourses, error } = result;

    if (error) {
      console.warn('[ContentService] DB Error:', error);
      throw new CoursesLoadError();
    }
    if (!dbCourses || dbCourses.length === 0) {
      return [];
    }

      let completedLessonIds: Set<string> = new Set();
      if (userId) {
        const { data: progressData } = await supabase
            .from('user_progress')
            .select('lesson_id')
            .eq('user_id', userId);
        
        if (progressData) {
            progressData.forEach(p => completedLessonIds.add(p.lesson_id));
        }
      }

      const courses: Course[] = dbCourses.map((c: any) => {
        const sortedModules = c.modules?.sort((a: any, b: any) => 
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        ) || [];

        let courseCompletedLessons = 0;
        let totalCourseLessons = 0;
        let globalNextLessonId = '';

        const modules = sortedModules.map((m: any) => {
            const sortedLessons = m.lessons?.sort((a: any, b: any) => 
                new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            ) || [];

            totalCourseLessons += sortedLessons.length;
            let moduleCompletedLessons = 0;

            const lessons = sortedLessons.map((l: any, index: number) => {
                const isCompleted = completedLessonIds.has(l.id);
                if (isCompleted) moduleCompletedLessons++;
                let locked = false;
                if (index > 0) {
                    const prevLessonId = sortedLessons[index - 1].id;
                    if (!completedLessonIds.has(prevLessonId)) locked = true;
                } 
                if (!isCompleted && !locked && !globalNextLessonId) {
                    globalNextLessonId = l.id;
                }
                return {
                    ...l,
                    moduleId: m.id,
                    isCompleted,
                    locked,
                    videoUrl: l.video_url || 'https://www.youtube.com/watch?v=M576WGiDBdQ',
                    homeworkTask: l.homework_task || l.homeworkTask || null
                };
            });

            return {
                ...m,
                lessons,
                totalLessons: lessons.length,
                progress: lessons.length > 0 ? Math.round((moduleCompletedLessons / lessons.length) * 100) : 0
            };
        });

        courseCompletedLessons = modules.reduce((acc: number, m: any) => {
             return acc + m.lessons.filter((l: any) => l.isCompleted).length;
        }, 0);

        return {
            ...c,
            modules,
            progress: totalCourseLessons > 0 ? Math.round((courseCompletedLessons / totalCourseLessons) * 100) : 0,
            nextLessonId: globalNextLessonId,
            coverImage: c.cover_image
        };
      });

    setCachedCourses(userId, courses);
    return courses;
  },

  async markLessonComplete(userId: string, lessonId: string): Promise<boolean> {
      try {
          const { error } = await supabase.from('user_progress').insert({
              user_id: userId,
              lesson_id: lessonId
          });
          if (error && error.code !== '23505') throw error;
          await supabase.rpc('increment_xp', { x_val: 50 });
          return true;
      } catch (e) {
          console.error("Failed to mark lesson:", e);
          return false;
      }
  }
};
