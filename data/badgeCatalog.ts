import {
  Zap, Navigation, Hammer, MessageCircle, Trophy, Star, Medal, Activity,
  type LucideIcon,
} from 'lucide-react';

export type BadgeTier = 'bronze' | 'silver' | 'gold' | 'obsidian';

export interface BadgeStats {
  lessonsCompleted: number;
  homeworkSubmitted: number;
  level: number;
  xp: number;
  leaderboardRank: number | null;
}

export interface BadgeDefinition {
  id: string;
  title: string;
  subtitle: string;
  requirement: string;
  icon: LucideIcon;
  tier: BadgeTier;
  isUnlocked: (s: BadgeStats) => boolean;
  progress: (s: BadgeStats) => number;
}

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

export const BADGE_CATALOG: BadgeDefinition[] = [
  {
    id: 'ignition',
    title: 'Зажигание',
    subtitle: 'Первый импульс',
    requirement: 'Завершить 1 урок',
    icon: Zap,
    tier: 'bronze',
    isUnlocked: (s) => s.lessonsCompleted >= 1,
    progress: (s) => clamp01(s.lessonsCompleted / 1),
  },
  {
    id: 'vector',
    title: 'Вектор',
    subtitle: 'Траектория роста',
    requirement: 'Завершить 10 уроков',
    icon: Navigation,
    tier: 'silver',
    isUnlocked: (s) => s.lessonsCompleted >= 10,
    progress: (s) => clamp01(s.lessonsCompleted / 10),
  },
  {
    id: 'forge',
    title: 'Кузница',
    subtitle: 'Руки в коде',
    requirement: 'Сдать 3 домашних работы',
    icon: Hammer,
    tier: 'silver',
    isUnlocked: (s) => s.homeworkSubmitted >= 3,
    progress: (s) => clamp01(s.homeworkSubmitted / 3),
  },
  {
    id: 'oracle',
    title: 'Оракул',
    subtitle: 'Диалог с ИИ',
    requirement: 'Сдать 10 домашних работ',
    icon: MessageCircle,
    tier: 'gold',
    isUnlocked: (s) => s.homeworkSubmitted >= 10,
    progress: (s) => clamp01(s.homeworkSubmitted / 10),
  },
  {
    id: 'apex',
    title: 'Вершина',
    subtitle: 'Уровень мастерства',
    requirement: 'Достичь 10 уровня',
    icon: Trophy,
    tier: 'gold',
    isUnlocked: (s) => s.level >= 10,
    progress: (s) => clamp01(s.level / 10),
  },
  {
    id: 'constellation',
    title: 'Созвездие',
    subtitle: 'Светила рейтинга',
    requirement: 'Войти в топ-10 лидерборда',
    icon: Star,
    tier: 'obsidian',
    isUnlocked: (s) => s.leaderboardRank !== null && s.leaderboardRank <= 10,
    progress: (s) =>
      s.leaderboardRank === null ? 0 : s.leaderboardRank <= 10 ? 1 : clamp01(1 - (s.leaderboardRank - 10) / 40),
  },
  {
    id: 'century',
    title: 'Сотня',
    subtitle: 'Накопленный опыт',
    requirement: 'Набрать 500 XP',
    icon: Medal,
    tier: 'bronze',
    isUnlocked: (s) => s.xp >= 500,
    progress: (s) => clamp01(s.xp / 500),
  },
  {
    id: 'marathon',
    title: 'Марафон',
    subtitle: 'Дистанция',
    requirement: 'Завершить 30 уроков',
    icon: Activity,
    tier: 'gold',
    isUnlocked: (s) => s.lessonsCompleted >= 30,
    progress: (s) => clamp01(s.lessonsCompleted / 30),
  },
];

export const RING_SLOT_COUNT = 6;

export function getBadgeById(id: string): BadgeDefinition | undefined {
  return BADGE_CATALOG.find((b) => b.id === id);
}
