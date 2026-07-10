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
    title: 'Дашборд',
    body: 'Ваш центр управления. Отслеживайте прогресс, серию дней и изучайте лучшие работы резидентов в ленте.',
  },
  {
    anchor: 'nav-library',
    title: 'Обучение',
    body: 'Доступ к образовательным программам. Изучайте материалы и отправляйте решения на проверку наставникам.',
  },
  {
    anchor: 'nav-schedule',
    title: 'Календарь',
    body: 'Ваше расписание занятий. Управляйте временем и не пропускайте важные события.',
  },
  {
    anchor: 'nav-community',
    title: 'Комьюнити',
    body: 'Находите единомышленников, добавляйте в друзья и следите за их успехами.',
  },
  {
    anchor: 'notifications-home',
    title: 'Уведомления',
    body: 'Будьте в курсе. Важные события, статусы проектов и запросы в друзья.',
  },
  {
    anchor: 'nav-profile',
    title: 'Профиль',
    body: 'Ваша визитная карточка. Управляйте достижениями, статистикой, настройками и внешним видом.',
  },
  {
    anchor: 'nav-admin',
    title: 'Управление',
    body: 'Доступ к административной панели. Управление пользователями, курсами и проверкой заданий.',
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
