import React, { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { User, Role } from '../types';
import { Outlet, NavLink } from 'react-router-dom';
import { AnimatedIcon } from './ui/AnimatedIcon';
import { PageTransition } from './PageTransition';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';

interface LayoutProps {
  user: User;
}

export const Layout: React.FC<LayoutProps> = ({ user }) => {
  const { openAuthModal } = useAuth();
  const isGuest = user.role === Role.GUEST;
  const isAdmin = user.role === Role.ADMIN;
  const [logo, setLogo] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(typeof navigator !== 'undefined' && !navigator.onLine);

  useEffect(() => {
    supabase.from('settings').select('*').eq('id', 'logo_url').single()
      .then(({ data }) => { if (data?.value) setLogo(data.value); });
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
    if (locked) { e.preventDefault(); openAuthModal(); }
  };

  const MobileNavItem = ({ to, iconName, locked, label }: { to: string; iconName: any; locked: boolean; label: string }) => (
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
          <div className={`relative transition-transform duration-400 ease-spring ${isActive && !locked ? 'scale-110 drop-shadow-[0_0_12px_rgba(230,0,43,0.5)]' : ''}`}>
            <AnimatedIcon name={iconName} size={22} active={isActive && !locked} />
            {locked && (
              <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-kiddy-surfaceElevated border border-black">
                <AnimatedIcon name="lock" size={8} className="text-white" active={false} />
              </span>
            )}
          </div>
          {isActive && !locked && (
            <div className="w-1 h-1 rounded-full bg-kiddy-cherry animate-scale-in" />
          )}
          <span className={`text-[10px] font-semibold tracking-wide transition-colors duration-300 ${isActive && !locked ? 'text-white' : ''}`}>{label}</span>
        </>
      )}
    </NavLink>
  );

  return (
    <div className="min-h-screen bg-transparent text-white font-sans selection:bg-kiddy-cherry/30 selection:text-white flex flex-col md:flex-row">
      {isOffline && (
        <div className="fixed top-0 left-0 right-0 z-[100] bg-amber-500/95 text-black text-center py-2 px-4 text-sm font-semibold">
          Нет соединения с интернетом. Часть функций недоступна.
        </div>
      )}
      <Sidebar currentUser={user} />

      <header className="md:hidden sticky top-0 z-40 flex items-center justify-between px-5 h-16 glass">
        {logo ? <img src={logo} alt="Дети В ТОПЕ" className="h-7 w-auto object-contain" /> : <img src="/logo-vtope.png" alt="Дети В ТОПЕ" className="h-7 w-auto object-contain" />}
        <img src={user.avatar} alt="" className="w-8 h-8 rounded-full object-cover border border-white/[0.08]" />
      </header>

      <main className="flex-1 md:ml-[260px] min-h-screen px-4 md:px-10 xl:px-16 2xl:px-20 py-6 md:py-12 pb-28 md:pb-12">
        <PageTransition>
          <Outlet />
        </PageTransition>
      </main>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center justify-start gap-1 overflow-x-auto no-scrollbar glass py-2.5 px-2 pb-safe">
        <MobileNavItem to="/" iconName="dashboard" locked={false} label="Главная" />
        <MobileNavItem to="/courses" iconName="book" locked={isGuest} label="Курсы" />
        <MobileNavItem to="/schedule" iconName="calendar" locked={isGuest} label="План" />
        {isAdmin && <MobileNavItem to="/admin" iconName="shield" locked={false} label="Управление" />}
        <MobileNavItem to="/settings" iconName="settings" locked={isGuest} label="Настройки" />
        <MobileNavItem to="/profile" iconName="user" locked={isGuest} label="Профиль" />
      </nav>
    </div>
  );
};
