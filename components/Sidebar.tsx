
import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, BookOpen, Calendar, LogOut, User as UserIcon, Users, Sparkles, LogIn, Lock, Shield } from 'lucide-react';
import { User, Role } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';

interface SidebarProps {
  currentUser: User;
  onSwitchRole: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentUser, onSwitchRole }) => {
  const { openAuthModal, signOut } = useAuth();
  const location = useLocation();
  const isGuest = currentUser.role === Role.GUEST;
  const isAdmin = currentUser.role === Role.ADMIN;
  
  const [logo, setLogo] = useState<string | null>(null);
  const [schoolName, setSchoolName] = useState('Kiddy OS');

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

  // Базовые элементы навигации
  const navItems = [
    { icon: LayoutDashboard, label: 'Главная', path: '/', locked: false },
    { icon: BookOpen, label: 'Библиотека', path: '/courses', locked: isGuest },
    { icon: Sparkles, label: 'Наставник', path: '/ai-tutor', locked: isGuest },
    { icon: Calendar, label: 'Расписание', path: '/schedule', locked: isGuest },
    { icon: UserIcon, label: 'Профиль', path: '/profile', locked: isGuest },
  ];

  // Добавляем админку только если роль Admin
  if (isAdmin) {
      navItems.push({ icon: Shield, label: 'Управление', path: '/admin', locked: false });
  }

  const handleNavClick = (e: React.MouseEvent, locked: boolean) => {
    if (locked) {
      e.preventDefault();
      openAuthModal();
    }
  };

  return (
    <div className="h-screen w-72 bg-black border-r border-zinc-900/50 flex flex-col fixed left-0 top-0 hidden md:flex z-50">
      <div className="p-10 pb-12">
        {logo ? (
            <img src={logo} className="h-12 w-auto object-contain" alt="School Logo" />
        ) : (
            <h1 className="text-3xl font-display font-bold text-white tracking-tighter">
                {schoolName.split(' ')[0]} <span className="text-kiddy-primary">{schoolName.split(' ')[1] || 'OS'}</span>
            </h1>
        )}
      </div>

      <div className="px-8 mb-10">
        <div className="bg-zinc-950 border border-zinc-900 p-4 rounded-3xl flex items-center gap-4">
            <img src={currentUser.avatar} alt="User" className="w-11 h-11 rounded-2xl object-cover border border-zinc-800" />
            <div className="overflow-hidden">
                <p className="text-sm font-bold text-white truncate">{currentUser.name.split(' ')[0]}</p>
                <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest mt-0.5">
                  {isGuest ? 'Гость' : (isAdmin ? 'Администратор' : (currentUser.role === Role.STUDENT ? `Уровень ${currentUser.level}` : 'Родитель'))}
                </p>
            </div>
        </div>
      </div>

      <nav className="flex-1 px-6 space-y-3">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={(e) => handleNavClick(e, item.locked)}
            className={({ isActive }) => `
              flex items-center justify-between px-6 py-4 rounded-2xl text-sm font-bold transition-all duration-200 group relative
              ${isActive && !item.locked
                ? 'bg-kiddy-primary text-white shadow-lg shadow-kiddy-primary/20' 
                : 'text-zinc-500 hover:text-white hover:bg-zinc-900/50'}
              ${item.locked ? 'opacity-40' : ''}
            `}
          >
            <div className="flex items-center gap-4">
                <item.icon size={20} />
                {item.label}
            </div>
            {item.locked && <Lock size={14} className="text-zinc-800" />}
          </NavLink>
        ))}
      </nav>

      <div className="p-8 border-t border-zinc-900/50 space-y-4">
        {!isGuest && !isAdmin && (
            <button onClick={onSwitchRole} className="w-full flex items-center gap-3 px-6 py-2 text-zinc-600 hover:text-white text-[10px] uppercase tracking-widest font-bold transition-colors">
                <Users size={16} /> Переключить вид
            </button>
        )}
        
        {isGuest ? (
            <button onClick={openAuthModal} className="w-full flex items-center gap-3 px-6 py-4 bg-white text-black rounded-2xl text-sm font-bold hover:bg-kiddy-primary hover:text-white transition-all justify-center shadow-xl">
                <LogIn size={18} /> Авторизация
            </button>
        ) : (
            <button onClick={signOut} className="w-full flex items-center gap-3 px-6 py-2 text-zinc-600 hover:text-rose-500 text-sm font-bold transition-colors">
                <LogOut size={18} /> Выход
            </button>
        )}
      </div>
    </div>
  );
};
