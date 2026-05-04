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
    title: 'Главная и витрина',
    body: 'Твоя плашка с уровнем, XP и серией, быстрые кнопки в разделы. Ниже — лента одобренных проектов: лайкай работы одноклассников и (после входа) отправляй свою на модерацию.',
  },
  {
    anchor: 'nav-library',
    title: 'Курсы и практика',
    body: 'Учебные программы с видео и прогрессом. В уроках — практика: можно сдать домашнее задание текстом или фото, видеть статус проверки и комментарий наставника.',
  },
  {
    anchor: 'nav-schedule',
    title: 'Расписание',
    body: 'Занятия по дням: время, место и название пары. Текущий слот подсвечивается, если урок идёт сейчас.',
  },
  {
    anchor: 'nav-community',
    title: 'Ученики',
    body: 'Одноклассники, заявки в друзья и список друзей. Ленту проектов смотри на главной — здесь только люди.',
  },
  {
    anchor: 'notifications-home',
    title: 'Уведомления',
    body: 'Колокольчик в сайдбаре на десктопе и в шапке на телефоне: друзья, витрина, ответы по проектам и служебные сообщения для наставников.',
  },
  {
    anchor: 'nav-profile',
    title: 'Профиль',
    body: 'Персонаж, уровень, XP, достижения, медали и таблица лидеров. Чужие профили открываются из учеников или витрины.',
  },
  {
    anchor: 'nav-settings',
    title: 'Настройки',
    body: 'Аккаунт, медали на аватаре и раздел «Гид по разделам» — снова показать этот тур после обновлений приложения.',
  },
  {
    anchor: 'nav-admin',
    title: 'Управление',
    body: 'Для администраторов: пользователи, курсы, очередь проверки домашних заданий и настройки школы.',
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
