import {
  Zap, Navigation, Hammer, MessageCircle, Trophy, Star, Medal, Activity, Crown,
  type LucideIcon,
} from 'lucide-react';

/** bronze/silver — база; gold — серьёзный гринд; mythic — фиолетовые «хвастливые» */
export type BadgeTier = 'bronze' | 'silver' | 'gold' | 'mythic';

export interface BadgeStats {
  lessonsCompleted: number;
  homeworkSubmitted: number;
  /** Сумма tutor_count по строкам ai_usage (как в мобильном приложении) */
  aiTutorPromptsTotal: number;
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
    subtitle: 'Старт без слабаков',
    requirement: 'Завершить 5 уроков',
    icon: Zap,
    tier: 'bronze',
    isUnlocked: (s) => s.lessonsCompleted >= 5,
    progress: (s) => clamp01(s.lessonsCompleted / 5),
  },
  {
    id: 'century',
    title: 'Капитал опыта',
    subtitle: 'Уже не новичок',
    requirement: 'Набрать 2 500 XP',
    icon: Medal,
    tier: 'bronze',
    isUnlocked: (s) => s.xp >= 2500,
    progress: (s) => clamp01(s.xp / 2500),
  },
  {
    id: 'vector',
    title: 'Вектор',
    subtitle: 'Системная дисциплина',
    requirement: 'Завершить 40 уроков',
    icon: Navigation,
    tier: 'silver',
    isUnlocked: (s) => s.lessonsCompleted >= 40,
    progress: (s) => clamp01(s.lessonsCompleted / 40),
  },
  {
    id: 'forge',
    title: 'Кузница',
    subtitle: 'Домашки — в прод',
    requirement: 'Сдать 15 домашних работ',
    icon: Hammer,
    tier: 'silver',
    isUnlocked: (s) => s.homeworkSubmitted >= 15,
    progress: (s) => clamp01(s.homeworkSubmitted / 15),
  },
  {
    id: 'oracle',
    title: 'Оракул',
    subtitle: 'Наставник как второй пилот',
    requirement: 'Задать наставнику 80 вопросов (всего)',
    icon: MessageCircle,
    tier: 'gold',
    isUnlocked: (s) => s.aiTutorPromptsTotal >= 80,
    progress: (s) => clamp01(s.aiTutorPromptsTotal / 80),
  },
  {
    id: 'apex',
    title: 'Вершина',
    subtitle: 'Долгий путь по уровням',
    requirement: 'Достичь 22 уровня',
    icon: Trophy,
    tier: 'gold',
    isUnlocked: (s) => s.level >= 22,
    progress: (s) => clamp01(s.level / 22),
  },
  {
    id: 'marathon',
    title: 'Марафон',
    subtitle: 'Один курс за другим',
    requirement: 'Завершить 80 уроков',
    icon: Activity,
    tier: 'gold',
    isUnlocked: (s) => s.lessonsCompleted >= 80,
    progress: (s) => clamp01(s.lessonsCompleted / 80),
  },
  {
    id: 'constellation',
    title: 'Созвездие',
    subtitle: 'Элита академии',
    requirement: 'Войти в топ-5 лидерборда по XP',
    icon: Star,
    tier: 'mythic',
    isUnlocked: (s) => s.leaderboardRank !== null && s.leaderboardRank <= 5,
    progress: (s) =>
      s.leaderboardRank === null ? 0 : s.leaderboardRank <= 5 ? 1 : clamp01(1 - (s.leaderboardRank - 5) / 45),
  },
  {
    id: 'monarch',
    title: 'Монарх рейтинга',
    subtitle: 'Первый без компромиссов',
    requirement: 'Занять 1-е место в лидерборде',
    icon: Crown,
    tier: 'mythic',
    isUnlocked: (s) => s.leaderboardRank === 1,
    progress: (s) => {
      if (s.leaderboardRank === null) return 0;
      if (s.leaderboardRank === 1) return 1;
      return clamp01(1 / s.leaderboardRank);
    },
  },
];

export const RING_SLOT_COUNT = 6;

export function getBadgeById(id: string): BadgeDefinition | undefined {
  return BADGE_CATALOG.find((b) => b.id === id);
}
