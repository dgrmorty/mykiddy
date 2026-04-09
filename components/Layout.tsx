import React, { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { User, Role } from '../types';
import { Outlet, NavLink, Link } from 'react-router-dom';
import { AnimatedIcon } from './ui/AnimatedIcon';
import { PageTransition } from './PageTransition';
import { AvatarImage } from './AvatarImage';
import { BrandLogo } from './BrandLogo';
import { useAuth } from '../contexts/AuthContext';
import { useBranding } from '../contexts/BrandingContext';
import { NotificationProvider, useNotificationSummary } from '../contexts/NotificationContext';
import { OnboardingTour } from './onboarding/OnboardingTour';

interface LayoutProps {
  user: User;
}

function LayoutShell({ user }: LayoutProps) {
  const { openAuthModal } = useAuth();
  const { logoUrl } = useBranding();
  const { unreadCount } = useNotificationSummary();
  const isGuest = user.role === Role.GUEST;
  const isAdmin = user.role === Role.ADMIN;
  const [isOffline, setIsOffline] = useState(typeof navigator !== 'undefined' && !navigator.onLine);

  useEffect(() => {
    const onOnline = () => setIsOffline(false);
    const onOffline = () => setIsOffline(true);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  const handleNavClick = (e: React.MouseEvent, locked: boolean) => {
    if (locked) {
      e.preventDefault();
      openAuthModal();
    }
  };

  const MobileNavItem = ({
    to,
    iconName,
    locked,
    label,
    tourAnchor,
  }: {
    to: string;
    iconName: React.ComponentProps<typeof AnimatedIcon>['name'];
    locked: boolean;
    label: string;
    tourAnchor?: string;
  }) => (
    <NavLink
      id={tourAnchor && !locked ? `tour-mob-${tourAnchor}` : undefined}
      to={to}
      onClick={(e) => handleNavClick(e, locked)}
      className={({ isActive }) =>
        `flex w-full min-w-0 flex-col items-center gap-1 px-1 py-2 rounded-2xl transition-all duration-400 ease-spring
         ${isActive && !locked ? 'text-kiddy-cherry' : 'text-kiddy-textSecondary hover:text-white active:scale-90'}`
      }
    >
      {({ isActive }) => (
        <>
          <div
            className={`relative transition-transform duration-400 ease-spring ${isActive && !locked ? 'scale-110 drop-shadow-[0_0_12px_rgba(230,0,43,0.5)]' : ''}`}
          >
            <AnimatedIcon name={iconName} size={22} active={isActive && !locked} />
            {locked && (
              <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full border border-black bg-kiddy-surfaceElevated">
                <AnimatedIcon name="lock" size={8} className="text-white" active={false} />
              </span>
            )}
          </div>
          {isActive && !locked && <div className="h-1 w-1 animate-scale-in rounded-full bg-kiddy-cherry" />}
          <span
            className={`text-[10px] font-semibold tracking-wide transition-colors duration-300 ${isActive && !locked ? 'text-white' : ''}`}
          >
            {label}
          </span>
        </>
      )}
    </NavLink>
  );

  return (
    <div className="flex min-h-screen min-h-[100dvh] flex-col bg-transparent font-sans text-white selection:bg-kiddy-cherry/30 selection:text-white md:flex-row">
      {isOffline && (
        <div className="fixed left-0 right-0 top-0 z-[100] bg-amber-500/95 px-4 pb-2 pt-[max(0.5rem,env(safe-area-inset-top,0px))] text-center text-sm font-semibold text-black">
          Нет соединения с интернетом. Часть функций недоступна.
        </div>
      )}
      <Sidebar currentUser={user} />

      <header className="glass sticky top-0 z-40 flex min-h-[3.25rem] items-center justify-between gap-3 px-4 pt-safe sm:px-5 md:hidden">
        <BrandLogo
          url={logoUrl}
          alt="Дети В ТОПЕ"
          compactWordmark
          className="h-7 w-auto max-w-[min(200px,55vw)] shrink-0 object-contain object-left"
          wordmarkClassName="max-w-[min(220px,58vw)]"
        />
        <div className="flex shrink-0 items-center gap-2">
          {!isGuest && (
            <Link
              id="tour-mob-notifications"
              to="/notifications"
              title="Уведомления"
              aria-label="Уведомления"
              className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-kiddy-textSecondary transition-colors active:scale-95"
            >
              <AnimatedIcon name="bell" size={20} active={false} />
              {unreadCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-kiddy-cherry px-1 text-[8px] font-bold tabular-nums text-white ring-2 ring-[#050505]">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </Link>
          )}
          <AvatarImage
            src={user.avatar}
            name={user.name}
            alt=""
            className="h-8 w-8 rounded-full border border-white/[0.08] object-cover"
          />
        </div>
      </header>

      <main className="flex min-h-0 w-full min-w-0 max-w-[100vw] flex-1 flex-col overflow-x-hidden px-3 py-6 pb-28 sm:px-4 md:ml-[288px] md:max-w-none md:min-h-screen md:px-10 md:py-12 md:pb-12 xl:px-16 2xl:px-20">
        <PageTransition>
          <Outlet />
        </PageTransition>
      </main>

      <nav
        className={`glass fixed bottom-0 left-0 right-0 z-50 grid w-full max-w-[100vw] items-stretch px-safe py-2 pb-safe md:hidden ${
          isAdmin ? 'grid-cols-7' : 'grid-cols-6'
        }`}
      >
        <MobileNavItem to="/" iconName="dashboard" locked={false} label="Главная" tourAnchor="nav-home" />
        <MobileNavItem to="/courses" iconName="book" locked={isGuest} label="Курсы" tourAnchor="nav-library" />
        <MobileNavItem to="/schedule" iconName="calendar" locked={isGuest} label="План" tourAnchor="nav-schedule" />
        <MobileNavItem to="/community" iconName="usersGroup" locked={isGuest} label="Ученики" tourAnchor="nav-community" />
        {isAdmin && (
          <MobileNavItem to="/admin" iconName="shield" locked={false} label="Управление" tourAnchor="nav-admin" />
        )}
        <MobileNavItem to="/settings" iconName="settings" locked={isGuest} label="Настройки" tourAnchor="nav-settings" />
        <MobileNavItem to="/profile" iconName="user" locked={isGuest} label="Профиль" tourAnchor="nav-profile" />
      </nav>

      <OnboardingTour userId={user.id} isGuest={isGuest} role={user.role} />
    </div>
  );
}

export const Layout: React.FC<LayoutProps> = ({ user }) => {
  const isGuest = user.role === Role.GUEST;
  return (
    <NotificationProvider userId={isGuest ? null : user.id}>
      <LayoutShell user={user} />
    </NotificationProvider>
  );
};
