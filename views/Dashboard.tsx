import React, { useState } from 'react';
import { Role, User } from '../types';
import { Sparkles, BookOpen, CalendarDays } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useNavigate } from 'react-router-dom';
import { useContent } from '../hooks/useContent';
import { ProjectShowcasePanel } from './ProjectShowcasePanel';
import { ShowcaseSubmitModal } from './ShowcaseSubmitModal';

interface DashboardProps {
  user: User;
}

export const Dashboard: React.FC<DashboardProps> = ({ user }) => {
  const { isGuest, openAuthModal } = useAuth();
  const { showToast } = useToast();
  const { loadError } = useContent(user?.id !== 'guest' ? user?.id : undefined);
  const navigate = useNavigate();
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

  return (
    <div className="max-w-5xl mx-auto w-full pt-8 pb-24 px-4 md:px-8">
      <ShowcaseSubmitModal isOpen={showcaseModalOpen} onClose={() => setShowcaseModalOpen(false)} />

      <div className="pt-12 text-center mb-20 md:pt-20">
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
