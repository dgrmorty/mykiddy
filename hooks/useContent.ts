import { useState, useEffect, useCallback, useRef } from 'react';
import { Course } from '../types';
import { contentService, CoursesLoadError } from '../services/contentService';

export const useContent = (userId?: string | null) => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const loadGenerationRef = useRef(0);

  const loadContent = useCallback(async () => {
    const gen = ++loadGenerationRef.current;
    setLoadError(null);
    setLoading(true);
    try {
      const data = await contentService.getCourses(userId ?? undefined);
      if (gen !== loadGenerationRef.current) return;
      setCourses(data);
    } catch (e) {
      if (gen !== loadGenerationRef.current) return;
      if (e instanceof CoursesLoadError) {
        setLoadError('Не удалось загрузить. Повторите позже.');
      } else {
        console.error(e);
        setLoadError('Не удалось загрузить. Повторите позже.');
      }
      setCourses([]);
    } finally {
      if (gen === loadGenerationRef.current) {
        setLoading(false);
      }
    }
  }, [userId]);

  useEffect(() => {
    loadContent();
  }, [loadContent]);

  return { courses, loading, loadError, retryLoad: loadContent };
};
