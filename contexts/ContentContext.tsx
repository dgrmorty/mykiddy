
import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Course, Lesson } from '../types';

interface ContentContextType {
  activeCourse: Course | null;
  setActiveCourse: (course: Course | null) => void;
  activeLesson: Lesson | null;
  setActiveLesson: (lesson: Lesson | null) => void;
  resetNavigation: () => void;
}

const ContentContext = createContext<ContentContextType | undefined>(undefined);

export const ContentProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [activeCourse, setActiveCourse] = useState<Course | null>(null);
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);

  const resetNavigation = () => {
    setActiveCourse(null);
    setActiveLesson(null);
  };

  return (
    <ContentContext.Provider value={{ 
      activeCourse, 
      setActiveCourse, 
      activeLesson, 
      setActiveLesson,
      resetNavigation 
    }}>
      {children}
    </ContentContext.Provider>
  );
};

export const useContentContext = () => {
  const context = useContext(ContentContext);
  if (!context) throw new Error('useContentContext must be used within a ContentProvider');
  return context;
};
