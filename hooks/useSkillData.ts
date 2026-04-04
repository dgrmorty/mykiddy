import { useMemo } from 'react';
import { Course } from '../types';

export interface SkillPoint {
  subject: string;
  A: number;
  fullMark: number;
}

const SKILL_CATEGORIES = [
  { name: 'Python', keywords: ['python', 'питон', 'алгоритм', 'код', 'программ'] },
  { name: '3D', keywords: ['3d', 'blender', 'моделиров', 'дизайн', 'анимац'] },
  { name: 'Web', keywords: ['web', 'html', 'css', 'javascript', 'js', 'сайт', 'веб', 'react'] },
  { name: 'Логика', keywords: ['логик', 'матем', 'алгебр', 'задач', 'структур'] },
  { name: 'Креатив', keywords: ['креатив', 'творч', 'рисован', 'проект', 'идей', 'scratch', 'скретч'] },
];

function categorize(title: string): string {
  const lower = title.toLowerCase();
  for (const cat of SKILL_CATEGORIES) {
    if (cat.keywords.some(kw => lower.includes(kw))) return cat.name;
  }
  return 'Креатив';
}

export function computeSkillData(courses: Course[]): SkillPoint[] {
  const totals: Record<string, { completed: number; total: number }> = {};
  for (const cat of SKILL_CATEGORIES) {
    totals[cat.name] = { completed: 0, total: 0 };
  }

  for (const course of courses) {
    const cat = categorize(course.title);
    for (const mod of course.modules) {
      for (const lesson of mod.lessons) {
        totals[cat].total++;
        if (lesson.isCompleted) totals[cat].completed++;
      }
    }
  }

  return SKILL_CATEGORIES.map(cat => {
    const { completed, total } = totals[cat.name];
    const value = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { subject: cat.name, A: value, fullMark: 100 };
  });
}

export function useSkillData(courses: Course[]): SkillPoint[] {
  return useMemo(() => computeSkillData(courses), [courses]);
}
