
import { supabase } from './supabase';
import { Course, Lesson, Module } from '../types';

export const contentService = {
  
  async getCourses(userId?: string): Promise<Course[]> {
    // Создаем промис с таймаутом 3 секунды
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('DATABASE_TIMEOUT')), 3000)
    );

    try {
      console.log('[ContentService] Fetching courses...');
      
      // Запускаем гонку: либо данные из БД, либо таймаут
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

      const result: any = await Promise.race([dbRequest, timeoutPromise]);
      const { data: dbCourses, error } = result;

      if (error || !dbCourses || dbCourses.length === 0) {
        console.warn('[ContentService] DB Empty or Error, returning empty array');
        return []; // Возвращаем пустой массив вместо моковых данных
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

      return courses;

    } catch (e) {
      console.error('[ContentService] Critical error or timeout, returning empty array:', e);
      return []; // Возвращаем пустой массив вместо моковых данных
    }
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
