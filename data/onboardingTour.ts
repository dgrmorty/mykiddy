/** Якоря совпадают с id: tour-dsk-${anchor} / tour-mob-${anchor} */
export interface OnboardingStepDef {
  anchor: string;
  title: string;
  body: string;
  /** Только для администраторов */
  adminOnly?: boolean;
}

export const ONBOARDING_TOUR_VERSION = 'v1';

export function onboardingStorageKey(userId: string): string {
  return `mykiddy_onboarding_${ONBOARDING_TOUR_VERSION}_${userId}`;
}

/** Порядок: сначала библиотека, как просили; в конце главная как «точка входа». */
export const ONBOARDING_STEPS: OnboardingStepDef[] = [
  {
    anchor: 'nav-library',
    title: 'Библиотека курсов',
    body: 'Здесь все учебные программы: видеоуроки, прогресс и домашние задания. Начинайте обучение с выбранного курса.',
  },
  {
    anchor: 'nav-schedule',
    title: 'Расписание',
    body: 'Расписание занятий школы: дни недели, время и место. Текущая пара подсвечивается, если идёт прямо сейчас.',
  },
  {
    anchor: 'nav-community',
    title: 'Ученики',
    body: 'Каталог одноклассников: смотрите профили, отправляйте заявки в друзья и принимайте входящие.',
  },
  {
    anchor: 'notifications-home',
    title: 'Уведомления',
    body: 'Колокольчик в боковом меню (на телефоне — в верхней шапке): заявки в друзья, активность и ответы по профилю.',
  },
  {
    anchor: 'nav-profile',
    title: 'Профиль',
    body: 'Ваш уровень, XP, достижения, медали и таблица лидеров — всё в одном месте.',
  },
  {
    anchor: 'nav-settings',
    title: 'Настройки',
    body: 'Аккаунт, отображение медалей на аватаре и персональные параметры.',
  },
  {
    anchor: 'nav-home',
    title: 'Главная',
    body: 'Сводка: курсы, навыки, ближайшие занятия. Удобная точка входа после входа в сервис.',
  },
  {
    anchor: 'nav-admin',
    title: 'Управление',
    body: 'Панель администратора: пользователи, курсы и настройки школы (только для админов).',
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
