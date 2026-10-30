/** Якоря совпадают с id: tour-dsk-${anchor} / tour-mob-${anchor} */
export interface OnboardingStepDef {
  anchor: string;
  title: string;
  body: string;
  /** Только для администраторов */
  adminOnly?: boolean;
}

/** Смена версии показывает тур снова всем, кто уже прошёл предыдущую. */
export const ONBOARDING_TOUR_VERSION = 'v2';

export function onboardingStorageKey(userId: string): string {
  return `mykiddy_onboarding_${ONBOARDING_TOUR_VERSION}_${userId}`;
}

/** Старые ключи localStorage — чистим при «Гид по разделам», чтобы не путать версии. */
const ONBOARDING_LEGACY_VERSIONS = ['v1'] as const;

/** Удалить прогресс тура для пользователя (текущая и прошлые версии ключа). */
export function clearAllOnboardingKeys(userId: string): void {
  const versions = new Set<string>([...ONBOARDING_LEGACY_VERSIONS, ONBOARDING_TOUR_VERSION]);
  for (const v of versions) {
    try {
      localStorage.removeItem(`mykiddy_onboarding_${v}_${userId}`);
    } catch {
      /* ignore */
    }
  }
}

/** Порядок: от главной и витрины → учёба → соцслужебное → настройки; админ — в конце. */
export const ONBOARDING_STEPS: OnboardingStepDef[] = [
  {
    anchor: 'nav-home',
    title: 'Главная',
    body: 'Здесь быстрый доступ ко всему важному и витрина — лучшие проекты ребят из школы.',
  },
  {
    anchor: 'nav-library',
    title: 'Обучение',
    body: 'Курсы, видеоуроки и задания твоего уровня. Домашку проверяет наставник.',
  },
  {
    anchor: 'nav-community',
    title: 'Сообщество',
    body: 'Одноклассники и друзья. Добавляй ребят в друзья и смотри, чем они занимаются.',
  },
  {
    anchor: 'notifications-home',
    title: 'Уведомления',
    body: 'Ответы наставника по домашке, заявки в друзья и новости о твоих проектах.',
  },
  {
    anchor: 'nav-profile',
    title: 'Профиль',
    body: 'Твой уровень, опыт и бейджи. Здесь же можно сменить аватар и снова открыть этот гид.',
  },
  {
    anchor: 'nav-admin',
    title: 'Управление',
    body: 'Админ-панель: ученики, курсы и проверка домашних заданий.',
    adminOnly: true,
  },
];

export function getStepsForUser(isAdmin: boolean): OnboardingStepDef[] {
  return ONBOARDING_STEPS.filter((s) => !s.adminOnly || isAdmin);
}

export function tourElementIds(anchor: string): { desktop: string; mobile: string } {
  if (anchor === 'notifications-home') {
    return { desktop: 'tour-dsk-notifications', mobile: 'tour-mob-notifications' };
  }
  return { desktop: `tour-dsk-${anchor}`, mobile: `tour-mob-${anchor}` };
}

export function resolveTourTarget(anchor: string): HTMLElement | null {
  if (typeof document === 'undefined') return null;
  const { desktop, mobile } = tourElementIds(anchor);
  const isMobile = window.matchMedia('(max-width: 767px)').matches;
  const primary = document.getElementById(isMobile ? mobile : desktop);
  if (primary) return primary;
  return document.getElementById(desktop) || document.getElementById(mobile);
}
