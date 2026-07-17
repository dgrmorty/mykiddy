import React, { useRef, useState } from 'react';
import { Role, User } from '../types';
import { Sparkles, Zap, BookOpen, Flame, CalendarDays, Trophy } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useNavigate } from 'react-router-dom';
import { useContent } from '../hooks/useContent';
import { UserAvatar } from '../components/UserAvatar';
import { ProjectShowcasePanel } from './ProjectShowcasePanel';
import { ShowcaseSubmitModal } from './ShowcaseSubmitModal';
import { AnimatedEmptyState } from '../components/ui/AnimatedEmptyState';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

import { ScrollTrigger } from 'gsap/ScrollTrigger';
gsap.registerPlugin(useGSAP, ScrollTrigger);

interface DashboardProps {
  user: User;
}

const DynamicIsland = ({ user, isGuest }: { user: User, isGuest: boolean }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    if (!containerRef.current) return;
    
    const ctx = gsap.context(() => {
      gsap.to(containerRef.current, {
        width: isExpanded ? 340 : 200,
        height: isExpanded ? 220 : 48,
        borderRadius: isExpanded ? 32 : 24,
        duration: 0.7,
        ease: 'elastic.out(1, 0.6)',
      });

      if (isExpanded) {
        gsap.to('.island-compact', { autoAlpha: 0, duration: 0.2, y: -10 });
        gsap.to('.island-expanded', { autoAlpha: 1, duration: 0.4, delay: 0.15, y: 0, stagger: 0.05, ease: 'power2.out' });
      } else {
        gsap.to('.island-expanded', { autoAlpha: 0, duration: 0.2, y: 10 });
        gsap.to('.island-compact', { autoAlpha: 1, duration: 0.4, delay: 0.2, y: 0 });
      }
    }, containerRef);

    return () => ctx.revert();
  }, [isExpanded]);

  return (
    <div 
      className="hero-island flex justify-center mb-16 relative z-50 perspective-[1000px] will-change-transform"
      onMouseLeave={() => setIsExpanded(false)}
    >
      {/* Subtle cherry glow behind the island */}
      <div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-kiddy-cherry/20 blur-2xl rounded-full pointer-events-none transition-all duration-700 ease-out" 
        style={{ width: isExpanded ? 360 : 220, height: isExpanded ? 240 : 60, opacity: isExpanded ? 0.4 : 0.15 }} 
      />
      <div 
        ref={containerRef}
        className="cursor-pointer flex flex-col items-center bg-black shadow-island overflow-hidden relative will-change-[width,height,border-radius]"
        onClick={() => setIsExpanded(!isExpanded)}
        style={{ width: 200, height: 48, borderRadius: 24 }}
      >
        {/* Compact View */}
        <div className="island-compact absolute inset-0 flex items-center justify-between px-1.5 w-full h-[48px]">
          <UserAvatar user={user} size="sm" />
          <span className="text-sm font-medium text-white truncate px-3">{user.name.split(' ')[0]}</span>
          <div className="h-9 w-12 rounded-full bg-white/10 flex items-center justify-center shrink-0 gap-1 px-2">
            <Flame size={14} className="text-orange-500" />
            <span className="text-xs font-bold text-white">{user.streakCurrent || 0}</span>
          </div>
        </div>

        {/* Expanded View */}
        <div className="island-expanded absolute inset-0 p-6 flex flex-col opacity-0 invisible w-[340px] h-[220px]">
          <div className="flex items-center gap-4 mb-6">
            <UserAvatar user={user} size="lg" />
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-medium text-white truncate">{user.name}</h3>
              <p className="text-sm text-kiddy-textSecondary truncate">{isGuest ? 'Гость' : 'Студент'}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white/5 rounded-2xl p-3 flex flex-col items-center justify-center">
              <Trophy size={18} className="text-zinc-400 mb-1.5" />
              <span className="text-xl font-medium text-white">{user.level}</span>
              <span className="text-[10px] text-zinc-500 uppercase tracking-widest mt-0.5">Ур</span>
            </div>
            <div className="bg-white/5 rounded-2xl p-3 flex flex-col items-center justify-center">
              <Zap size={18} className="text-zinc-400 mb-1.5" />
              <span className="text-xl font-medium text-white">{(user.xp || 0).toLocaleString()}</span>
              <span className="text-[10px] text-zinc-500 uppercase tracking-widest mt-0.5">XP</span>
            </div>
            <div className="bg-white/5 rounded-2xl p-3 flex flex-col items-center justify-center">
              <Flame size={18} className="text-zinc-400 mb-1.5" />
              <span className="text-xl font-medium text-white">{user.streakCurrent || 0}</span>
              <span className="text-[10px] text-zinc-500 uppercase tracking-widest mt-0.5">Дней</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const Dashboard: React.FC<DashboardProps> = ({ user }) => {
  const { isGuest, openAuthModal } = useAuth();
  const { showToast } = useToast();
  const { courses, loading, loadError } = useContent(user?.id !== 'guest' ? user?.id : undefined);
  const navigate = useNavigate();
  const rootRef = useRef<HTMLDivElement>(null);
  const [showcaseModalOpen, setShowcaseModalOpen] = useState(false);

  const handleGoCourses = () => isGuest ? openAuthModal() : navigate('/courses');
  const handleGoSchedule = () => isGuest ? openAuthModal() : navigate('/schedule');

  const handleSuggestProject = () => {
    if (isGuest) return openAuthModal();
    if (user.role === Role.STUDENT) {
      setShowcaseModalOpen(true);
      return;
    }
    showToast('Предложить проект на витрину могут только ученики.', 'info');
  };

  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      // Анимация Dynamic Island при загрузке
      gsap.from('.hero-island', {
        y: 50,
        scale: 0.85,
        opacity: 0,
        duration: 1.2,
        ease: 'elastic.out(1, 0.75)',
      });

      // Анимация заголовка и текста
      gsap.from('.hero-text', {
        y: 60,
        opacity: 0,
        duration: 1.2,
        stagger: 0.15,
        delay: 0.15,
        ease: 'elastic.out(1, 0.75)',
      });

      // Анимация кнопок
      gsap.from('.hero-btn', {
        scale: 0.8,
        opacity: 0,
        duration: 1,
        stagger: 0.1,
        delay: 0.4,
        ease: 'elastic.out(1, 0.6)',
      });

      // Анимация блока витрины (появляется при скролле или сразу, если на экране)
      gsap.from('.showcase-header', {
        y: 40,
        opacity: 0,
        duration: 1,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: '.showcase-section',
          start: 'top 80%',
        }
      });
    });
    return () => mm.revert();
  }, { scope: rootRef });

  if (loading && courses.length === 0) {
    return (
      <div className="flex min-h-[min(420px,70vh)] flex-col items-center justify-center pb-10">
        <AnimatedEmptyState message="Собираем главную" />
      </div>
    );
  }

  return (
    <div ref={rootRef} className="max-w-4xl mx-auto w-full pt-12 pb-24 px-4 md:px-8">
      <ShowcaseSubmitModal isOpen={showcaseModalOpen} onClose={() => setShowcaseModalOpen(false)} />
      
      <DynamicIsland user={user} isGuest={isGuest} />

      <div className="text-center mb-20">
        <h1 className="hero-text text-5xl md:text-7xl font-display font-medium tracking-tight text-white mb-6">
          {isGuest ? 'Начни свой путь в IT.' : 'Продолжай учиться.'}
        </h1>
        <p className="hero-text text-lg md:text-xl text-kiddy-textSecondary max-w-2xl mx-auto mb-12 font-light">
          {loadError 
            ? 'Не удалось загрузить данные. Попробуйте обновить страницу.' 
            : 'Твоя персональная траектория, проекты и сообщество в одном месте.'}
        </p>
        
        <div className="flex flex-wrap items-center justify-center gap-4">
          <button onClick={handleGoCourses} className="hero-btn btn-cta px-8 py-4 text-sm">
            <BookOpen size={18} className="mr-2" />
            Мои курсы
          </button>
          <button onClick={handleGoSchedule} className="hero-btn btn-secondary px-8 py-4 text-sm">
            <CalendarDays size={18} className="mr-2" />
            Расписание
          </button>
        </div>
      </div>

      <div className="showcase-section mt-32">
        <div className="showcase-header flex items-end justify-between mb-10">
          <div>
            <h2 className="text-3xl md:text-4xl font-display font-medium text-white tracking-tight">Витрина проектов</h2>
            <p className="text-kiddy-textSecondary mt-3 text-lg font-light">Лучшие работы наших учеников.</p>
          </div>
          <button onClick={handleSuggestProject} className="hidden sm:flex btn-secondary px-6 py-3 text-sm">
            <Sparkles size={16} className="mr-2" />
            Предложить проект
          </button>
        </div>
        
        <ProjectShowcasePanel embed postLimit={6} onSuggestProject={handleSuggestProject} />
        
        <div className="mt-8 sm:hidden">
          <button onClick={handleSuggestProject} className="w-full btn-secondary px-6 py-4 text-sm justify-center">
            <Sparkles size={16} className="mr-2" />
            Предложить проект
          </button>
        </div>
      </div>

    </div>
  );
};
