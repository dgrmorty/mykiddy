
import { useState, useEffect } from 'react';
import { Course } from '../types';
import { contentService } from '../services/contentService';

export const useContent = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadContent = async () => {
        try {
            const data = await contentService.getCourses();
            setCourses(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    loadContent();
  }, []);

  return { courses, loading };
};
