
import React, { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { User, Role } from '../types';
import { Outlet, NavLink } from 'react-router-dom';
import { Home, BookOpen, Calendar, User as UserIcon, Sparkles, Lock, Shield } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';

interface LayoutProps {
  user: User;
  onSwitchRole: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ user, onSwitchRole }) => {
  const { openAuthModal } = useAuth();
  const isGuest = user.role === Role.GUEST;
  const isAdmin = user.role === Role.ADMIN;
  
  const [logo, setLogo] = useState<string | null>(null);

  useEffect(() => {
    supabase.from('settings').select('*').eq('id', 'logo_url').single()
        .then(({ data }) => { if(data?.value) setLogo(data.value); });
  }, []);

  const handleNavClick = (e: React.MouseEvent, locked: boolean) => {
    if (locked) {
      e.preventDefault();
      openAuthModal();
    }
  };

  const MobileNavItem = ({ to, icon: Icon, locked, label }: { to: string, icon: any, locked: boolean, label?: string }) => (
    <NavLink 
        to={to} 
        onClick={(e) => handleNavClick(e, locked)}
        className={({isActive}) => `
            relative flex flex-col items-center gap-1 p-2 transition-colors
            ${isActive && !locked ? "text-kiddy-primary" : "text-zinc-500"}
        `}
    >
        <div className="relative">
            <Icon size={22} />
            {locked && (
                <div className="absolute -top-1 -right-2 bg-zinc-900 rounded-full p-[2px] border border-zinc-800">
                    <Lock size={8} className="text-zinc-500" />
                </div>
            )}
        </div>
        {label && <span className="text-[8px] font-bold uppercase tracking-tighter">{label}</span>}
    </NavLink>
  );

  return (
    <div className="min-h-screen bg-kiddy-base text-kiddy-text font-sans selection:bg-kiddy-primary selection:text-white">
      <Sidebar currentUser={user} onSwitchRole={onSwitchRole} />
      
      {/* Mobile Header */}
      <div 
        className="md:hidden border-b border-zinc-800 flex items-center justify-between px-4 sticky top-0 bg-kiddy-base/80 backdrop-blur-md z-40"
        style={{ 
          paddingTop: 'max(1rem, env(safe-area-inset-top))',
          paddingBottom: '1rem'
        }}
      >
        {logo ? (
            <img src={logo} alt="Kiddy" className="h-8 w-auto object-contain" />
        ) : (
            <span className="font-display font-bold text-white italic">Kiddy OS</span>
        )}
        <img 
            src={user.avatar} 
            alt="User" 
            className="w-8 h-8 rounded-full border border-zinc-700" 
            onClick={!isAdmin ? onSwitchRole : undefined} 
        />
      </div>

      <main className="md:ml-64 p-4 md:p-8 max-w-7xl mx-auto min-h-screen pb-32 md:pb-8">
        <Outlet />
      </main>

      {/* Mobile Bottom Navigation */}
      <div 
        className="md:hidden fixed bottom-0 left-0 w-full bg-kiddy-surface/95 backdrop-blur-lg border-t border-zinc-800 px-2 flex justify-around items-center z-50"
        style={{ 
          paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))',
          paddingTop: '0.75rem'
        }}
      >
        <MobileNavItem to="/" icon={Home} locked={false} label="Дом" />
        <MobileNavItem to="/courses" icon={BookOpen} locked={isGuest} label="Курсы" />
        <MobileNavItem to="/ai-tutor" icon={Sparkles} locked={isGuest} label="ИИ" />
        
        {isAdmin ? (
            <MobileNavItem to="/admin" icon={Shield} locked={false} label="Админ" />
        ) : (
            <MobileNavItem to="/schedule" icon={Calendar} locked={isGuest} label="План" />
        )}
        
        <MobileNavItem to="/profile" icon={UserIcon} locked={isGuest} label="Профиль" />
      </div>
    </div>
  );
};
