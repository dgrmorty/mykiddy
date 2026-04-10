import { AVATAR_BOY_PATH, AVATAR_GIRL_PATH } from './data/defaultAvatars';
import { Course, CourseType, Role, User } from './types';

export const CURRENT_USER_STUDENT: User = {
  id: 'u1',
  name: 'Алекс Новик',
  role: Role.STUDENT,
  avatar: AVATAR_BOY_PATH,
  avatarAccessory: 'none',
  level: 12,
  xp: 4520,
  isApproved: true,
};

export const CURRENT_USER_PARENT: User = {
  id: 'p1',
  name: 'Елена Новик',
  role: Role.PARENT,
  avatar: AVATAR_GIRL_PATH,
  avatarAccessory: 'none',
  level: 0,
  xp: 0,
  isApproved: true,
};

export const GUEST_USER: User = {
  id: 'guest',
  name: 'Гость',
  role: Role.GUEST,
  avatar: AVATAR_BOY_PATH,
  avatarAccessory: 'none',
  level: 0,
  xp: 0,
  isApproved: false,
  streakCurrent: 0,
  streakLongest: 0,
};

export const MOCK_COURSES: Course[] = [
  {
    id: 'c3',
    type: 'Дизайн' as any,
    title: 'Blender 3D: Быстрый Старт',
    description: 'Создание 3D персонажей и игровых миров с нуля.',
    progress: 10,
    nextLessonId: 'l3-1',
    coverImage: 'https://picsum.photos/800/402?grayscale',
    yearTier: 'year_1',
    modules: [
        {
            id: 'm3-1',
            title: 'Основы Blender',
            progress: 10,
            totalLessons: 8,
            lessons: [
                { 
                    id: 'l3-1', 
                    moduleId: 'm3-1', 
                    title: 'Интерфейс Blender 4.0', 
                    description: 'Основы навигации и управления камерой.', 
                    duration: '20м', 
                    isCompleted: true, 
                    locked: false,
                    videoUrl: 'https://www.youtube.com/watch?v=MF1qEhBSfq4',
                    homeworkTask: 'Сделайте скриншот интерфейса Blender, где выбрана камера, и опишите, какой горячей клавишей вы вызвали круговое меню видов.'
                },
                { 
                    id: 'l3-2', 
                    moduleId: 'm3-1', 
                    title: 'Моделирование Пончика', 
                    description: 'Легендарное введение в меши и скульптурный режим.', 
                    duration: '45м', 
                    isCompleted: false, 
                    locked: false,
                    videoUrl: 'https://www.youtube.com/watch?v=nIoXOplUvAw',
                    homeworkTask: 'Создайте модель Low Poly дерева. Используйте минимум 3 разных примитива. Напишите, какие модификаторы вы использовали.'
                },
            ]
        }
    ]
  },
  {
    id: 'c1',
    type: CourseType.PYTHON,
    title: 'Python: Архитектура ИИ',
    description: 'Освойте логику нейронных сетей и автоматизации на профессиональном уровне.',
    progress: 65,
    nextLessonId: 'l1-3',
    coverImage: 'https://picsum.photos/800/400?grayscale',
    yearTier: 'year_2_plus',
    modules: [
      {
        id: 'm1',
        title: 'Логика и Структуры',
        progress: 100,
        totalLessons: 4,
        lessons: [
          { 
            id: 'l1-1', 
            moduleId: 'm1', 
            title: 'Python за 100 секунд', 
            description: 'Быстрый обзор возможностей языка.', 
            duration: '2м', 
            isCompleted: true, 
            locked: false,
            videoUrl: 'https://www.youtube.com/watch?v=x7X9w_GIm1s'
          },
          { 
            id: 'l1-2', 
            moduleId: 'm1', 
            title: 'Как работает память', 
            description: 'Основы компьютерной архитектуры.', 
            duration: '12м', 
            isCompleted: true, 
            locked: false,
            videoUrl: 'https://www.youtube.com/watch?v=p3q5zWCw8J4'
          },
        ]
      },
      {
        id: 'm2',
        title: 'Алгоритмы и Сложность',
        progress: 30,
        totalLessons: 5,
        lessons: [
          { 
            id: 'l1-3', 
            moduleId: 'm2', 
            title: 'Big O Нотация', 
            description: 'Как измерить эффективность вашего кода.', 
            duration: '10м', 
            isCompleted: false, 
            locked: false,
            videoUrl: 'https://www.youtube.com/watch?v=RBSGKlAvoiM',
            homeworkTask: 'Напишите функцию на Python, которая находит дубликаты в списке за время O(n). Объясните, почему ваше решение эффективно.',
            codeSnippet: `def binary_search(arr, low, high, x):
    if high >= low:
        mid = (high + low) // 2
        if arr[mid] == x:
            return mid
        elif arr[mid] > x:
            return binary_search(arr, low, mid - 1, x)
        else:
            return binary_search(arr, mid + 1, high, x)
    else:
        return -1`
          },
        ]
      }
    ]
  }
];

export const SKILL_DATA = [
  { subject: 'Логика', A: 120, fullMark: 150 },
  { subject: 'Синтаксис', A: 98, fullMark: 150 },
  { subject: 'Архитектура', A: 86, fullMark: 150 },
  { subject: 'Отладка', A: 99, fullMark: 150 },
  { subject: 'Креатив', A: 85, fullMark: 150 },
  { subject: 'Скорость', A: 65, fullMark: 150 },
];
