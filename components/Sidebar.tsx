import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { AnimatedIcon } from './ui/AnimatedIcon';
import { User, Role } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';

interface SidebarProps {
  currentUser: User;
}

const STAGGER = [0.05, 0.1, 0.15, 0.2, 0.25, 0.3];

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
        const l = data.find(i => i.id === 'logo_url')?.value;
        const s = data.find(i => i.id === 'school_name')?.value;
        if (l) setLogo(l);
        if (s) setSchoolName(s);
      }
    };
    fetchBranding();
  }, []);

  type NavIcon = 'dashboard' | 'book' | 'calendar' | 'user' | 'shield';
  const navItems: { iconName: NavIcon; label: string; path: string; locked: boolean }[] = [
    { iconName: 'dashboard', label: 'Главная', path: '/', locked: false },
    { iconName: 'book', label: 'Библиотека', path: '/courses', locked: isGuest },
    { iconName: 'calendar', label: 'Расписание', path: '/schedule', locked: isGuest },
    { iconName: 'user', label: 'Профиль', path: '/profile', locked: isGuest },
  ];
  if (isAdmin || isTeacher) navItems.push({ iconName: 'shield', label: 'Управление', path: '/admin', locked: false });

  const handleNavClick = (e: React.MouseEvent, locked: boolean) => {
    if (locked) { e.preventDefault(); openAuthModal(); }
  };

  const location = useLocation();
  const activeIndex = navItems.findIndex(item => 
    item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path)
  );

  return (
    <aside className="hidden md:flex fixed left-0 top-0 z-50 h-screen w-[260px] flex-col bg-kiddy-base border-r border-white/[0.04] backdrop-blur-2xl">
      <div className="absolute inset-0 bg-gradient-to-b from-white/[0.015] via-transparent to-white/[0.005] pointer-events-none" />
      <div className="absolute top-0 left-0 w-40 h-40 bg-kiddy-cherry/[0.03] rounded-full blur-[80px] pointer-events-none" />
      
      <div className="relative flex flex-col flex-1 min-h-0 p-6 pt-10">
        <div className="mb-10 px-2 animate-reveal-up" style={{ animationDelay: '0.02s' }}>
          {logo ? (
            <img src={logo} className="h-8 w-auto object-contain" alt={schoolName} />
          ) : (
            <img src="/logo-vtope.png" className="h-9 w-auto object-contain" alt={schoolName} />
          )}
        </div>

        <nav className="flex-1 relative">
          {activeIndex !== -1 && (
            <div 
              className="absolute left-0 w-[3px] bg-kiddy-cherry rounded-r-md transition-all duration-500 z-10"
              style={{ 
                top: `${activeIndex * 50 + 10}px`, 
                height: '24px',
                boxShadow: '0 0 12px var(--kiddy-cherry)',
                transitionTimingFunction: 'cubic-bezier(0.175, 0.885, 0.32, 1.1)'
              }}
            />
          )}
          <div className="space-y-1.5">
            {navItems.map((item, i) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={(e) => handleNavClick(e, item.locked)}
                className={({ isActive }) =>
                  `flex items-center gap-4 rounded-xl px-3 py-3 text-sm font-semibold transition-all duration-300 ease-entrance
                   ${item.locked ? 'pointer-events-none opacity-40' : 'active:scale-[0.97]'}
                   ${isActive && !item.locked 
                      ? 'nav-active' 
                      : 'text-kiddy-textSecondary hover:text-white hover:bg-white/[0.04]'}`
                }
                style={{ 
                  animationDelay: `${STAGGER[i]}s`, 
                  animation: 'reveal-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) both'
                }}
              >
                {({ isActive }) => (
                  <>
                    <div className={isActive ? 'text-kiddy-cherry drop-shadow-[0_0_8px_rgba(230,0,43,0.4)]' : ''}>
                      <AnimatedIcon name={item.iconName} size={20} className="shrink-0" active={isActive} />
                    </div>
                    <span className="tracking-wide">{item.label}</span>
                    {item.locked && <AnimatedIcon name="lock" size={14} className="ml-auto opacity-50" active={false} />}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </nav>

        <div className="mt-auto space-y-4 pt-6 border-t border-white/[0.04]">
          <div className="flex items-center gap-3 px-2">
            <div className="relative">
              <img src={currentUser.avatar} alt="" className="w-10 h-10 rounded-full object-cover border border-white/[0.08]" />
              <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-kiddy-base" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-sm text-white truncate tracking-wide">{currentUser.name.split(' ')[0]}</p>
              <p className="text-xs text-kiddy-textMuted font-medium mt-0.5">
                {isGuest ? 'Гость' : isAdmin ? 'Админ' : isTeacher ? 'Преподаватель' : currentUser.role === Role.PARENT ? 'Родитель' : `Уровень ${currentUser.level}`}
              </p>
            </div>
          </div>

          <div className="space-y-1">
            {isGuest ? (
              <button type="button" onClick={openAuthModal} className="btn-cta w-full py-3.5 mt-4 text-sm tracking-wide">
                Войти в аккаунт
              </button>
            ) : (
              <button
                type="button"
                onClick={signOut}
                className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-kiddy-textSecondary hover:text-white hover:bg-white/[0.03] transition-all group"
              >
                <AnimatedIcon name="logout" size={18} className="group-hover:text-white" active={false} />
                Выйти
              </button>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
