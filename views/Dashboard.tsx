import React, { useState } from 'react';
import { Role, User } from '../types';
import {
  Sparkles,
  BookOpen,
  CalendarDays,
  ArrowRight,
  PlayCircle,
  Rocket,
  Bot,
  Users,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useNavigate } from 'react-router-dom';
import { useContent } from '../hooks/useContent';
import { ProjectShowcasePanel } from './ProjectShowcasePanel';
import { ShowcaseSubmitModal } from './ShowcaseSubmitModal';

interface DashboardProps {
  user: User;
}

type Tile = {
  icon: React.ReactNode;
  title: string;
  text: string;
  onClick?: () => void;
};

export const Dashboard: React.FC<DashboardProps> = ({ user }) => {
  const { isGuest, openAuthModal } = useAuth();
  const { showToast } = useToast();
  const { loadError } = useContent(user?.id !== 'guest' ? user?.id : undefined);
  const navigate = useNavigate();
  const [showcaseModalOpen, setShowcaseModalOpen] = useState(false);

  const handleGoCourses = () => (isGuest ? openAuthModal() : navigate('/courses'));
  const handleGoSchedule = () => (isGuest ? openAuthModal() : navigate('/schedule'));
  const handleGoCommunity = () => (isGuest ? openAuthModal() : navigate('/community'));

  const handleSuggestProject = () => {
    if (isGuest) return openAuthModal();
    if (user.role === Role.STUDENT) {
      setShowcaseModalOpen(true);
      return;
    }
    showToast('Предложить проект на витрину могут только ученики.', 'info');
  };

  const firstName = !isGuest ? (user?.name || '').trim().split(/\s+/)[0] : '';

  const tiles: Tile[] = isGuest
    ? [
        {
          icon: <PlayCircle size={20} strokeWidth={1.75} />,
          title: 'Видеоуроки и задания',
          text: 'Короткие уроки, практика и проверка домашки наставником.',
        },
        {
          icon: <Rocket size={20} strokeWidth={1.75} />,
          title: 'Свои проекты',
          text: 'Игры, сайты и приложения — лучшие попадают на витрину.',
        },
        {
          icon: <Bot size={20} strokeWidth={1.75} />,
          title: 'ИИ-тьютор',
          text: 'Подскажет, если застрял, и объяснит ошибку простыми словами.',
        },
      ]
    : [
        {
          icon: <BookOpen size={20} strokeWidth={1.75} />,
          title: 'Мои курсы',
          text: 'Продолжи с того места, где остановился.',
          onClick: handleGoCourses,
        },
        {
          icon: <CalendarDays size={20} strokeWidth={1.75} />,
          title: 'Расписание',
          text: 'Ближайшие занятия твоей группы.',
          onClick: handleGoSchedule,
        },
        {
          icon: <Users size={20} strokeWidth={1.75} />,
          title: 'Сообщество',
          text: 'Одногруппники, друзья и рейтинг.',
          onClick: handleGoCommunity,
        },
      ];

  return (
    <div className="mx-auto w-full max-w-6xl px-1 pb-24 pt-4 sm:px-4 md:px-8 md:pt-8">
      <ShowcaseSubmitModal isOpen={showcaseModalOpen} onClose={() => setShowcaseModalOpen(false)} />

      {/* ─── Hero ─── */}
      <section className="hero-stage relative pb-16 pt-10 text-center md:pb-24 md:pt-20">
        <div className="hero-stage__grid" aria-hidden="true" />
        <div className="hero-stage__orb" aria-hidden="true" />

        <div className="relative z-10 flex flex-col items-center">
          <span className="eyebrow-pill mb-7 animate-fade-in-up">
            <span className="eyebrow-pill__dot" aria-hidden="true" />
            {isGuest ? 'IT-школа «Дети В ТОПЕ»' : 'Платформа учеников'}
          </span>

          <h1
            className="hero-title mb-6 max-w-4xl animate-fade-in-up font-display text-[2.6rem] font-semibold leading-[1.02] tracking-[-0.035em] sm:text-6xl md:text-7xl"
            style={{ animationDelay: '60ms' }}
          >
            {isGuest ? (
              <>
                Начни свой путь
                <br />
                <span className="text-cherry-gradient">в IT.</span>
              </>
            ) : (
              <>
                {firstName ? `Привет, ${firstName}.` : 'С возвращением.'}
                <br />
                <span className="text-cherry-gradient">Продолжаем учиться.</span>
              </>
            )}
          </h1>

          <p
            className="mx-auto mb-10 max-w-xl animate-fade-in-up text-base leading-relaxed text-zinc-400 [text-wrap:balance] md:text-lg"
            style={{ animationDelay: '120ms' }}
          >
            {loadError
              ? 'Не удалось загрузить данные. Попробуйте обновить страницу.'
              : 'Твоя персональная траектория, проекты и сообщество — в одном месте.'}
          </p>

          <div
            className="flex w-full animate-fade-in-up flex-col items-stretch justify-center gap-3 sm:w-auto sm:flex-row sm:items-center"
            style={{ animationDelay: '180ms' }}
          >
            <button type="button" onClick={handleGoCourses} className="btn-cta group h-14 px-8 text-[15px]">
              {isGuest ? 'Начать обучение' : 'Мои курсы'}
              <ArrowRight
                size={18}
                className="ml-2 transition-transform duration-300 ease-entrance group-hover:translate-x-1"
              />
            </button>
            <button type="button" onClick={handleGoSchedule} className="btn-secondary h-14 px-8 text-[15px]">
              <CalendarDays size={18} className="mr-2 opacity-80" />
              Расписание
            </button>
          </div>
        </div>
      </section>

      {/* ─── Feature / quick-access tiles ─── */}
      <section className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-3">
        {tiles.map((t, i) => {
          const content = (
            <>
              <span className="feature-tile__icon">{t.icon}</span>
              <span className="min-w-0 flex-1">
                <span className="block font-display text-[15px] font-semibold tracking-tight text-white">
                  {t.title}
                </span>
                <span className="mt-1 block text-sm leading-relaxed text-zinc-400">{t.text}</span>
              </span>
              {t.onClick && (
                <ArrowRight
                  size={18}
                  className="feature-tile__arrow shrink-0 self-center text-zinc-500"
                  aria-hidden="true"
                />
              )}
            </>
          );
          const style = { animationDelay: `${240 + i * 70}ms` };
          return t.onClick ? (
            <button
              key={t.title}
              type="button"
              onClick={t.onClick}
              className="feature-tile is-interactive animate-fade-in-up text-left"
              style={style}
            >
              {content}
            </button>
          ) : (
            <div key={t.title} className="feature-tile animate-fade-in-up" style={style}>
              {content}
            </div>
          );
        })}
      </section>

      {/* ─── Showcase ─── */}
      <section className="mt-24 md:mt-32">
        <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between md:mb-10">
          <div>
            <p className="eyebrow mb-3">Витрина</p>
            <h2 className="font-display text-3xl font-semibold tracking-[-0.03em] text-white md:text-4xl">
              Проекты учеников
            </h2>
            <p className="mt-3 max-w-md text-base text-zinc-400">
              Игры, сайты и приложения, которые ребята сделали сами.
            </p>
          </div>
          <button
            type="button"
            onClick={handleSuggestProject}
            className="btn-secondary h-12 w-full px-6 text-sm sm:w-auto"
          >
            <Sparkles size={16} className="mr-2 text-kiddy-cherry" />
            Предложить проект
          </button>
        </div>

        <ProjectShowcasePanel embed postLimit={6} onSuggestProject={handleSuggestProject} />
      </section>
    </div>
  );
};
