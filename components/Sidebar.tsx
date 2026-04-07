import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { AnimatedIcon } from './ui/AnimatedIcon';
import { User, Role } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import { AvatarImage } from './AvatarImage';

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
  const isGuest = currentUser.role === Role.GUEST;
  const isAdmin = currentUser.role === Role.ADMIN;
  const isTeacher = currentUser.role === Role.TEACHER;
  const [logo, setLogo] = useState<string | null>(null);
  const [schoolName, setSchoolName] = useState('Дети В ТОПЕ');

  useEffect(() => {
    const fetchBranding = async () => {
      const { data } = await supabase.from('settings').select('*');
      if (data) {
        const l = data.find((i) => i.id === 'logo_url')?.value;
        const s = data.find((i) => i.id === 'school_name')?.value;
        if (l) setLogo(l);
        if (s) setSchoolName(s);
      }
    };
    fetchBranding();
  }, []);

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
  const xpToNext = Math.min(100, ((currentUser.xp % 100) / 100) * 100);

  const nameWords = schoolName.trim().split(/\s+/).filter(Boolean);
  const isVtopeStyle =
    nameWords.length >= 3 &&
    nameWords[nameWords.length - 2]?.toLowerCase() === 'в' &&
    nameWords[nameWords.length - 1]?.toLowerCase() === 'топе';
  const titleHead = isVtopeStyle ? nameWords.slice(0, -2).join(' ') : '';
  const titleTail = isVtopeStyle ? nameWords.slice(-2).join(' ') : nameWords.join(' ');

  return (
    <aside className="hidden md:flex fixed left-0 top-0 z-50 h-screen w-[288px] flex-col border-r border-white/[0.06] bg-kiddy-base backdrop-blur-2xl">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_50%_at_50%_-20%,rgba(230,0,43,0.08),transparent)]" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/[0.02] via-transparent to-white/[0.015]" />
      <div className="pointer-events-none absolute -left-16 bottom-32 h-48 w-48 rounded-full bg-kiddy-cherry/[0.04] blur-[70px]" />

      <div className="relative flex min-h-0 flex-1 flex-col px-5 pb-5 pt-7">
        <div
          className="mb-6 flex shrink-0 items-center gap-3.5 px-1 animate-reveal-up"
          style={{ animationDelay: '0.02s' }}
        >
          {logo ? (
            <img
              src={logo}
              className="h-11 w-auto max-w-[100px] shrink-0 object-contain object-left"
              alt=""
            />
          ) : (
            <img
              src="/logo-vtope.png"
              className="h-11 w-auto max-w-[100px] shrink-0 object-contain object-left"
              alt=""
            />
          )}
          <div
            className="h-11 w-px shrink-0 bg-gradient-to-b from-transparent via-kiddy-cherry/45 to-transparent"
            aria-hidden
          />
          <div className="min-w-0 flex-1" aria-label={schoolName}>
            {isVtopeStyle ? (
              <p className="font-display text-balance text-[1.0625rem] font-extrabold leading-[1.2] tracking-tight">
                <span className="text-white">{titleHead}</span>{' '}
                <span className="bg-gradient-to-r from-kiddy-cherry to-kiddy-cherryHover bg-clip-text text-transparent italic">
                  в топе
                </span>
              </p>
            ) : (
              <p className="font-display text-balance text-[1.0625rem] font-extrabold leading-[1.2] tracking-tight text-white">
                {titleTail}
              </p>
            )}
          </div>
        </div>

        <nav className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="shrink-0 space-y-5 pr-1">
            {navGroups.map((group) => (
              <div key={group.title}>
                <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.22em] text-zinc-600">
                  {group.title}
                </p>
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const i = staggerIndex++;
                    return (
                      <NavLink
                        key={item.path}
                        id={item.onboardingAnchor && !item.locked ? `tour-dsk-${item.onboardingAnchor}` : undefined}
                        to={item.path}
                        onClick={(e) => handleNavClick(e, item.locked)}
                        className={({ isActive: navIsActive }) =>
                          `flex items-center gap-3.5 rounded-xl border-l-[3px] py-2 pl-3 pr-3 text-sm font-semibold transition-all duration-300 ease-entrance
                          ${item.locked ? 'pointer-events-none opacity-40' : 'active:scale-[0.99]'}
                          ${navIsActive && !item.locked ? 'border-kiddy-cherry nav-active shadow-[inset_0_0_0_1px_rgba(230,0,43,0.08)]' : 'border-transparent'}
                          ${!navIsActive || item.locked ? 'text-kiddy-textSecondary hover:bg-white/[0.04] hover:text-white' : ''}`
                        }
                        style={{
                          animationDelay: `${STAGGER[Math.min(i, STAGGER.length - 1)]}s`,
                          animation: 'reveal-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) both',
                        }}
                      >
                        {({ isActive }) => (
                          <>
                            <div
                              className={
                                isActive && !item.locked
                                  ? 'text-kiddy-cherry drop-shadow-[0_0_8px_rgba(230,0,43,0.35)]'
                                  : ''
                              }
                            >
                              <AnimatedIcon name={item.iconName} size={20} className="shrink-0" active={isActive} />
                            </div>
                            <span className="min-w-0 flex-1 tracking-wide">{item.label}</span>
                            {item.locked && (
                              <AnimatedIcon name="lock" size={14} className="shrink-0 opacity-50" active={false} />
                            )}
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

            {!isGuest && (
              <div
                className="mt-4 shrink-0 rounded-2xl border border-white/[0.07] bg-gradient-to-br from-kiddy-cherry/[0.08] via-white/[0.02] to-transparent p-3.5 shadow-[0_0_0_1px_rgba(230,0,43,0.06)_inset]"
                style={{ animation: 'reveal-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) both', animationDelay: '0.35s' }}
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-kiddy-textMuted">Прогресс</span>
                  <span className="font-display text-sm font-bold tabular-nums text-white">
                    Ур. {currentUser.level}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-black/50 ring-1 ring-white/[0.06]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-kiddy-cherry to-kiddy-cherryHover transition-[width] duration-700"
                    style={{ width: `${xpToNext}%` }}
                  />
                </div>
                <p className="mt-2 text-xs font-medium text-kiddy-textSecondary">
                  {currentUser.xp.toLocaleString('ru-RU')} XP
                </p>
              </div>
            )}
          </div>
        </nav>

        <div className="mt-5 shrink-0 space-y-3 border-t border-white/[0.06] pt-5">
          <div className="flex items-center gap-3 rounded-xl border border-white/[0.05] bg-white/[0.02] px-3 py-2.5">
            <div className="relative shrink-0">
              <AvatarImage
                src={currentUser.avatar}
                name={currentUser.name}
                alt=""
                className="h-11 w-11 rounded-full border border-white/[0.1] object-cover"
              />
              {!isGuest && (
                <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-kiddy-base bg-emerald-500" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold tracking-wide text-white">{currentUser.name.split(' ')[0]}</p>
              <p className="mt-0.5 text-xs font-medium text-kiddy-textMuted">
                {isGuest
                  ? 'Гость'
                  : isAdmin
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
          </div>

          <div className="space-y-1">
            {isGuest ? (
              <button type="button" onClick={openAuthModal} className="btn-cta w-full py-3.5 text-sm tracking-wide">
                Войти в аккаунт
              </button>
            ) : (
              <button
                type="button"
                onClick={signOut}
                className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-kiddy-textSecondary transition-all hover:bg-white/[0.04] hover:text-white"
              >
                <AnimatedIcon name="logout" size={18} className="group-hover:text-white" active={false} />
                Выйти
              </button>
            )}
          </div>

          <p className="px-2 text-center text-[10px] leading-relaxed text-zinc-600">
            Учись · Расти · В топе
          </p>
        </div>
      </div>
    </aside>
  );
};
