import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import { AnimatedIcon } from './ui/AnimatedIcon';
import { User, Role } from '../types';
import { BrandLogo } from './BrandLogo';
import { useAuth } from '../contexts/AuthContext';
import { useBranding } from '../contexts/BrandingContext';
import { useNotificationSummary } from '../contexts/NotificationContext';
import { UserAvatar } from './UserAvatar';

interface SidebarProps {
  currentUser: User;
}

type NavIcon = 'dashboard' | 'book' | 'calendar' | 'usersGroup' | 'user' | 'settings' | 'shield';

interface NavItem {
  iconName: NavIcon;
  label: string;
  path: string;
  locked: boolean;
  /** Якорь онбординга → id tour-dsk-${anchor} */
  onboardingAnchor?: string;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const STAGGER = [0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.35, 0.4, 0.45];

export const Sidebar: React.FC<SidebarProps> = ({ currentUser }) => {
  const { openAuthModal, signOut } = useAuth();
  const { unreadCount } = useNotificationSummary();
  const { logoUrl, schoolName } = useBranding();
  const isGuest = currentUser.role === Role.GUEST;
  const isAdmin = currentUser.role === Role.ADMIN;
  const isTeacher = currentUser.role === Role.TEACHER;

  const navGroups: NavGroup[] = [
    {
      title: 'Обучение',
      items: [
        { iconName: 'dashboard', label: 'Главная', path: '/', locked: false, onboardingAnchor: 'nav-home' },
        { iconName: 'book', label: 'Библиотека', path: '/courses', locked: isGuest, onboardingAnchor: 'nav-library' },
        { iconName: 'calendar', label: 'Расписание', path: '/schedule', locked: isGuest, onboardingAnchor: 'nav-schedule' },
        { iconName: 'usersGroup', label: 'Ученики', path: '/community', locked: isGuest, onboardingAnchor: 'nav-community' },
      ],
    },
    {
      title: 'Аккаунт',
      items: [
        { iconName: 'user', label: 'Профиль', path: '/profile', locked: isGuest, onboardingAnchor: 'nav-profile' },
        { iconName: 'settings', label: 'Настройки', path: '/settings', locked: isGuest, onboardingAnchor: 'nav-settings' },
      ],
    },
  ];

  if (isAdmin) {
    navGroups.push({
      title: 'Система',
      items: [{ iconName: 'shield', label: 'Управление', path: '/admin', locked: false, onboardingAnchor: 'nav-admin' }],
    });
  }

  const handleNavClick = (e: React.MouseEvent, locked: boolean) => {
    if (locked) {
      e.preventDefault();
      openAuthModal();
    }
  };

  let staggerIndex = 0;

  const nameWords = schoolName.trim().split(/\s+/).filter(Boolean);
  const isVtopeStyle =
    nameWords.length >= 3 &&
    nameWords[nameWords.length - 2]?.toLowerCase() === 'в' &&
    nameWords[nameWords.length - 1]?.toLowerCase() === 'топе';
  const titleHead = isVtopeStyle ? nameWords.slice(0, -2).join(' ') : '';
  const titleTail = isVtopeStyle ? nameWords.slice(-2).join(' ') : nameWords.join(' ');

  return (
    <aside className="hidden md:flex fixed left-0 top-0 z-50 h-screen w-[288px] flex-col border-r border-white/[0.05] bg-[#000000]">

      <div className="relative flex min-h-0 flex-1 flex-col px-6 pb-6 pt-8">
        <div
          className="mb-8 flex shrink-0 items-start justify-between gap-3 px-1 animate-reveal-up"
          style={{ animationDelay: '0.02s' }}
        >
          <div className="flex min-w-0 flex-1 items-center gap-3.5">
            <BrandLogo
              url={logoUrl}
              alt=""
              className="h-10 w-auto max-w-[100px] shrink-0 object-contain object-left"
              wordmarkClassName="max-w-[100px] truncate"
            />
            <div
              className="h-10 w-px shrink-0 bg-white/10"
              aria-hidden
            />
            <div className="min-w-0 flex-1" aria-label={schoolName}>
              <p className="font-display text-balance text-[1.0625rem] font-extrabold leading-[1.2] tracking-tight text-white">
                {titleHead} {titleTail}
              </p>
            </div>
          </div>
          {!isGuest && (
            <Link
              id="tour-dsk-notifications"
              to="/notifications"
              title="Уведомления"
              aria-label="Уведомления"
              className="group relative mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/[0.05] bg-white/[0.02] text-zinc-500 transition-colors hover:border-white/[0.1] hover:bg-white/[0.05] hover:text-white"
            >
              <AnimatedIcon name="bell" size={20} active={false} />
              {unreadCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-white px-1 text-[8px] font-bold tabular-nums text-black ring-2 ring-black">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </Link>
          )}
        </div>

        <nav className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="shrink-0 space-y-6 pr-1 relative">
            {navGroups.map((group) => (
              <div key={group.title}>
                <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-600">
                  {group.title}
                </p>
                <div className="space-y-1 relative">
                  {group.items.map((item) => {
                    const i = staggerIndex++;
                    return (
                      <NavLink
                        key={item.path}
                        id={item.onboardingAnchor && !item.locked ? `tour-dsk-${item.onboardingAnchor}` : undefined}
                        to={item.path}
                        onClick={(e) => handleNavClick(e, item.locked)}
                        className={({ isActive: navIsActive }) =>
                          `relative flex items-center gap-3.5 rounded-[1.25rem] py-3 pl-3 pr-3 text-sm font-bold transition-all duration-500 ease-out overflow-hidden group
                          ${item.locked ? 'pointer-events-none opacity-40' : 'active:scale-[0.98]'}
                          ${navIsActive && !item.locked ? 'text-black' : 'text-zinc-400 hover:text-white'}`
                        }
                        style={{
                          animationDelay: `${STAGGER[Math.min(i, STAGGER.length - 1)]}s`,
                          animation: 'reveal-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) both',
                        }}
                      >
                        {({ isActive }) => (
                          <>
                            {isActive && !item.locked && (
                              <div className="absolute inset-0 bg-white rounded-[1.25rem] shadow-premium" style={{ zIndex: 0 }} />
                            )}
                            <div className="relative z-10 flex items-center gap-3.5 w-full">
                              <div className={isActive && !item.locked ? 'text-black' : 'text-zinc-500 group-hover:text-white transition-colors duration-300'}>
                                <AnimatedIcon name={item.iconName} size={20} className="shrink-0" active={isActive} />
                              </div>
                              <span className="min-w-0 flex-1 tracking-wide">{item.label}</span>
                              {item.locked && (
                                <AnimatedIcon name="lock" size={14} className="shrink-0 opacity-50" active={false} />
                              )}
                            </div>
                          </>
                        )}
                      </NavLink>
                    );
                  })}
                </div>
              </div>
            ))}
            </div>

            <div className="min-h-0 flex-1" aria-hidden />
          </div>
        </nav>

        <div className="mt-5 shrink-0 space-y-3 pt-5">
          {!isGuest ? (
            <Link
              to="/profile"
              title="Мой профиль"
              className="flex items-center gap-3 rounded-[1.5rem] border border-white/10 bg-white/5 p-2 pr-4 transition-all duration-300 hover:border-white/20 hover:bg-white/10 hover:shadow-island group"
            >
              <div className="relative shrink-0">
                <UserAvatar user={currentUser} size="md" />
                <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-black bg-emerald-500" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold tracking-wide text-white group-hover:text-zinc-200 transition-colors">{currentUser.name.split(' ')[0]}</p>
                <p className="mt-0.5 text-xs font-semibold text-zinc-500">
                  {isAdmin
                    ? 'Админ'
                    : isTeacher
                      ? 'Преподаватель'
                      : currentUser.role === Role.PARENT
                        ? 'Родитель'
                        : currentUser.role === Role.STUDENT
                          ? 'Ученик'
                          : `Уровень ${currentUser.level}`}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-0.5 text-right">
                <span className="rounded-lg bg-white/10 px-2 py-0.5 font-display text-[11px] font-bold tabular-nums text-white">
                  Ур. {currentUser.level}
                </span>
                <span className="max-w-[4.5rem] truncate text-[10px] font-bold tabular-nums text-zinc-500">
                  {currentUser.xp.toLocaleString('ru-RU')} XP
                </span>
              </div>
            </Link>
          ) : (
            <div className="flex items-center gap-3 rounded-[1.5rem] border border-white/10 bg-white/5 p-2 pr-4">
              <div className="relative shrink-0">
                <UserAvatar user={currentUser} size="md" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold tracking-wide text-white">{currentUser.name.split(' ')[0]}</p>
                <p className="mt-0.5 text-xs font-semibold text-zinc-500">Гость</p>
              </div>
            </div>
          )}

          <div className="space-y-1">
            {isGuest ? (
              <button type="button" onClick={openAuthModal} className="w-full rounded-2xl bg-white text-black font-bold py-3.5 text-sm tracking-wide hover:bg-zinc-200 transition-colors">
                Войти в аккаунт
              </button>
            ) : (
              <button
                type="button"
                onClick={signOut}
                className="group flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold text-zinc-500 transition-all hover:bg-white/5 hover:text-white"
              >
                <AnimatedIcon name="logout" size={18} className="group-hover:text-white transition-colors" active={false} />
                Выйти
              </button>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
};
