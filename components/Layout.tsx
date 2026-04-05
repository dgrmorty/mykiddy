import React, { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { User, Role } from '../types';
import { Outlet, NavLink, Link } from 'react-router-dom';
import { AnimatedIcon } from './ui/AnimatedIcon';
import { PageTransition } from './PageTransition';
import { AvatarImage } from './AvatarImage';
import { useAuth } from '../contexts/AuthContext';
import { NotificationProvider, useNotificationSummary } from '../contexts/NotificationContext';
import { supabase } from '../services/supabase';

interface LayoutProps {
  user: User;
}

function LayoutShell({ user }: LayoutProps) {
  const { openAuthModal } = useAuth();
  const { unreadCount } = useNotificationSummary();
  const isGuest = user.role === Role.GUEST;
  const isAdmin = user.role === Role.ADMIN;
  const [logo, setLogo] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(typeof navigator !== 'undefined' && !navigator.onLine);

  useEffect(() => {
    supabase
      .from('settings')
      .select('*')
      .eq('id', 'logo_url')
      .single()
      .then(({ data }) => {
        if (data?.value) setLogo(data.value);
      });
  }, []);

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
    badgeCount,
  }: {
    to: string;
    iconName: React.ComponentProps<typeof AnimatedIcon>['name'];
    locked: boolean;
    label: string;
    badgeCount?: number;
  }) => (
    <NavLink
      to={to}
      onClick={(e) => handleNavClick(e, locked)}
      className={({ isActive }) =>
        `flex shrink-0 flex-col items-center gap-1 px-3 py-2 rounded-2xl transition-all duration-400 ease-spring min-w-[56px]
         ${isActive && !locked ? 'text-kiddy-cherry' : 'text-kiddy-textSecondary hover:text-white active:scale-90'}`
      }
    >
      {({ isActive }) => (
        <>
          <div
            className={`relative transition-transform duration-400 ease-spring ${isActive && !locked ? 'scale-110 drop-shadow-[0_0_12px_rgba(230,0,43,0.5)]' : ''}`}
          >
            <AnimatedIcon name={iconName} size={22} active={isActive && !locked} />
            {!locked && badgeCount != null && badgeCount > 0 && (
              <span className="absolute -right-1 -top-0.5 flex h-[15px] min-w-[15px] items-center justify-center rounded-full bg-kiddy-cherry px-0.5 text-[8px] font-bold leading-none text-white">
                {badgeCount > 9 ? '9+' : badgeCount}
              </span>
            )}
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
    <div className="min-h-screen bg-transparent font-sans text-white selection:bg-kiddy-cherry/30 selection:text-white flex flex-col md:flex-row">
      {isOffline && (
        <div className="fixed left-0 right-0 top-0 z-[100] bg-amber-500/95 py-2 px-4 text-center text-sm font-semibold text-black">
          Нет соединения с интернетом. Часть функций недоступна.
        </div>
      )}
      <Sidebar currentUser={user} />

      <header className="glass sticky top-0 z-40 flex h-16 items-center justify-between px-5 md:hidden">
        {logo ? (
          <img src={logo} alt="Дети В ТОПЕ" className="h-7 w-auto object-contain" />
        ) : (
          <img src="/logo-vtope.png" alt="Дети В ТОПЕ" className="h-7 w-auto object-contain" />
        )}
        <div className="flex items-center gap-2">
          {!isGuest && (
            <Link
              to="/notifications"
              className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] text-kiddy-textSecondary transition-colors hover:border-kiddy-cherry/30 hover:text-white"
              aria-label="Уведомления"
            >
              <AnimatedIcon name="bell" size={20} active={false} />
              {unreadCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-kiddy-cherry px-1 text-[9px] font-bold text-white">
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

      <main className="min-h-screen flex-1 px-4 py-6 pb-28 md:ml-[288px] md:px-10 md:py-12 md:pb-12 xl:px-16 2xl:px-20">
        <PageTransition>
          <Outlet />
        </PageTransition>
      </main>

      <nav className="glass fixed bottom-0 left-0 right-0 z-50 flex items-center justify-start gap-1 overflow-x-auto px-2 py-2.5 pb-safe no-scrollbar md:hidden">
        <MobileNavItem to="/" iconName="dashboard" locked={false} label="Главная" />
        <MobileNavItem to="/courses" iconName="book" locked={isGuest} label="Курсы" />
        <MobileNavItem to="/schedule" iconName="calendar" locked={isGuest} label="План" />
        <MobileNavItem to="/community" iconName="usersGroup" locked={isGuest} label="Ученики" />
        <MobileNavItem
          to="/notifications"
          iconName="bell"
          locked={isGuest}
          label="Активность"
          badgeCount={!isGuest ? unreadCount : undefined}
        />
        {isAdmin && <MobileNavItem to="/admin" iconName="shield" locked={false} label="Управление" />}
        <MobileNavItem to="/settings" iconName="settings" locked={isGuest} label="Настройки" />
        <MobileNavItem to="/profile" iconName="user" locked={isGuest} label="Профиль" />
      </nav>
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
