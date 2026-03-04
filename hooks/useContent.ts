import { useState, useEffect, useCallback } from 'react';
import { Course } from '../types';
import { contentService, CoursesLoadError } from '../services/contentService';

export const useContent = (userId?: string | null) => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadContent = useCallback(async () => {
    setLoadError(null);
    setLoading(true);
    try {
      const data = await contentService.getCourses(userId ?? undefined);
      setCourses(data);
    } catch (e) {
      if (e instanceof CoursesLoadError) {
        setLoadError('Не удалось загрузить. Повторите позже.');
      } else {
        console.error(e);
        setLoadError('Не удалось загрузить. Повторите позже.');
      }
      setCourses([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadContent();
  }, [loadContent]);

  return { courses, loading, loadError, retryLoad: loadContent };
};
