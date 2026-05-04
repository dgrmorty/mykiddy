import React, { useState, useEffect, useMemo, useId } from 'react';
import { User } from '../types';
import { Card } from '../components/ui/Card';
import { Sparkles, Loader2, Zap, BookOpen, Flame } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useContent } from '../hooks/useContent';
import { UserAvatar } from '../components/UserAvatar';
import { ProjectShowcasePanel } from './ProjectShowcasePanel';

interface DashboardProps {
  user: User;
}

export const Dashboard: React.FC<DashboardProps> = ({ user }) => {
  const heroLineGradId = useId().replace(/:/g, '');
  const { isGuest, openAuthModal } = useAuth();
  const { courses, loading, loadError, retryLoad } = useContent(user?.id !== 'guest' ? user?.id : undefined);
  const [now, setNow] = useState(() => new Date());
  const navigate = useNavigate();

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  const headerDate = useMemo(() => {
    const s = now.toLocaleDateString('ru-RU', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
    return s.charAt(0).toUpperCase() + s.slice(1);
  }, [now]);

  const welcomeSubtitle = useMemo(() => {
    if (loadError) return 'Не удалось подгрузить курсы — нажми «Повторить» справа в плашке.';
    if (isGuest) return 'Войди, чтобы лайкать посты и отправить работу на витрину.';
    return 'Здесь одобренные проекты — лайкай и смотри, что делают одноклассники.';
  }, [isGuest, loadError]);

  const handleGoCourses = () => {
    if (isGuest) openAuthModal();
    else navigate('/courses');
  };
  const handleGoSchedule = () => {
    if (isGuest) openAuthModal();
    else navigate('/schedule');
  };
  const handleGoCommunity = () => {
    if (isGuest) openAuthModal();
    else navigate('/community');
  };

  if (loading && courses.length === 0) {
    return (
      <div className="flex min-h-[min(420px,70vh)] flex-col items-center justify-center gap-4 pb-10">
        <Loader2 className="animate-spin text-kiddy-cherry" size={40} strokeWidth={2} />
        <p className="text-center text-sm font-medium text-kiddy-textMuted">Загружаем…</p>
        <div className="mt-4 w-full max-w-2xl space-y-3">
          <div className="skeleton h-24 w-full rounded-2xl" />
          <div className="skeleton h-40 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10 md:space-y-8">
      <section className="stagger-1 relative">
        <Card className="relative overflow-hidden rounded-2xl border border-white/[0.1] bg-[#070708] p-4 shadow-[0_24px_70px_-36px_rgba(0,0,0,0.9)] ring-1 ring-inset ring-white/[0.04] md:rounded-3xl md:p-5 hover:!translate-y-0 hover:!transform-none hover:!bg-[#070708]">
          <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl md:rounded-3xl" aria-hidden>
            <div className="absolute inset-0 bg-gradient-to-b from-zinc-800/25 via-transparent to-[#030304]" />
            <div className="absolute -left-[18%] -top-[45%] h-[min(130%,30rem)] w-[min(90%,26rem)] rounded-full bg-gradient-to-br from-kiddy-cherry/50 via-kiddy-cherry/18 to-transparent blur-[88px] motion-safe:animate-dash-hero-blob-a motion-reduce:opacity-35" />
            <div className="absolute -bottom-[38%] -right-[12%] h-[min(110%,24rem)] w-[min(78%,22rem)] rounded-full bg-gradient-to-tl from-violet-600/40 via-indigo-500/12 to-transparent blur-[80px] motion-safe:animate-dash-hero-blob-b motion-reduce:opacity-30" />
            <div className="absolute left-[25%] top-1/2 h-[min(85%,20rem)] w-[min(65%,18rem)] -translate-y-1/2 rounded-full bg-cyan-400/12 blur-[64px] motion-safe:animate-dash-hero-blob-c motion-reduce:opacity-20" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_100%_70%_at_50%_-20%,rgba(255,255,255,0.06),transparent_50%)]" />
            <div className="absolute inset-x-0 bottom-0 h-[40%] bg-gradient-to-t from-black/45 to-transparent" />
            <svg
              className="dash-hero-svg-anim absolute inset-0 h-full w-full text-white/22"
              viewBox="0 0 800 220"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id={heroLineGradId} x1="0" y1="0" x2="1" y2="1">
                  <stop stopColor="currentColor" stopOpacity="0" />
                  <stop offset="0.35" stopColor="currentColor" stopOpacity="0.5" />
                  <stop offset="0.68" stopColor="#e6002b" stopOpacity="0.72" />
                  <stop offset="1" stopColor="currentColor" stopOpacity="0.18" />
                </linearGradient>
              </defs>
              <path
                className="dash-hero-line-path"
                d="M -40 200 C 140 20 320 -10 520 80 S 780 40 840 180"
                stroke={`url(#${heroLineGradId})`}
                strokeWidth="1.2"
                strokeLinecap="round"
              />
              <path
                className="dash-hero-line-path dash-hero-line-path--muted opacity-[0.38]"
                d="M 820 0 C 620 120 380 200 120 160 S -60 100 -20 240"
                stroke={`url(#${heroLineGradId})`}
                strokeWidth="0.85"
                strokeLinecap="round"
              />
              <path
                className="dash-hero-line-path dash-hero-line-path--wide opacity-[0.28]"
                d="M 0 110 C 200 180 500 0 800 95"
                stroke={`url(#${heroLineGradId})`}
                strokeWidth="0.7"
                strokeLinecap="round"
              />
            </svg>
          </div>

          <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-5">
            <UserAvatar user={{ id: user.id, name: user.name, avatar: user.avatar }} size="xl" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-kiddy-cherry">Главная</p>
                <time className="text-xs font-medium text-zinc-500 tabular-nums" dateTime={now.toISOString()}>
                  {headerDate}
                </time>
              </div>
              <h1 className="mt-1 font-display text-2xl font-extrabold tracking-tight text-white drop-shadow-sm md:text-3xl">
                {user.name}
              </h1>
              <p className="mt-1.5 text-sm leading-relaxed text-zinc-300/95">{welcomeSubtitle}</p>
              {loadError && (
                <button
                  type="button"
                  onClick={retryLoad}
                  className="btn-cta mt-3 rounded-full px-4 py-2 text-xs font-bold"
                >
                  Повторить
                </button>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.12] bg-black/35 px-3 py-1 text-xs font-bold text-white backdrop-blur-sm">
                  Ур. {user.level}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.12] bg-black/35 px-3 py-1 text-xs font-bold text-zinc-200 backdrop-blur-sm">
                  <Zap size={14} className="text-kiddy-cherry" aria-hidden />
                  {(user.xp ?? 0).toLocaleString('ru-RU')} XP
                </span>
                {!isGuest && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.12] bg-black/35 px-3 py-1 text-xs font-bold text-zinc-200 backdrop-blur-sm">
                    <BookOpen size={14} className="text-kiddy-cherry/90" aria-hidden />
                    {courses.length}{' '}
                    {courses.length === 1 ? 'курс' : courses.length > 1 && courses.length < 5 ? 'курса' : 'курсов'}
                  </span>
                )}
                {!isGuest && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-400/30 bg-orange-500/15 px-3 py-1 text-xs font-bold text-orange-50 backdrop-blur-sm">
                    <Flame size={14} className="text-orange-300" aria-hidden />
                    {user.streakCurrent ?? 0} дн.
                  </span>
                )}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleGoCourses}
                  className="inline-flex items-center gap-2 rounded-xl border border-kiddy-cherry/40 bg-kiddy-cherry/20 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-white shadow-[0_0_24px_-8px_rgba(230,0,43,0.35)] transition-colors hover:bg-kiddy-cherry/30"
                >
                  <BookOpen size={15} strokeWidth={2} />
                  Курсы
                </button>
                <button
                  type="button"
                  onClick={handleGoSchedule}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/[0.14] bg-white/[0.07] px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-zinc-200 backdrop-blur-sm transition-colors hover:border-white/25 hover:bg-white/[0.1] hover:text-white"
                >
                  Расписание
                </button>
                <button
                  type="button"
                  onClick={handleGoCommunity}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/[0.14] bg-white/[0.07] px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-zinc-200 backdrop-blur-sm transition-colors hover:border-white/25 hover:bg-white/[0.1] hover:text-white"
                >
                  <Sparkles size={15} strokeWidth={2} />
                  Ученики
                </button>
              </div>
            </div>
          </div>
        </Card>
      </section>

      <section className="stagger-2 space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-kiddy-cherry">Ученики</p>
            <h2 className="font-display text-xl font-bold tracking-tight text-white md:text-2xl">Лента проектов</h2>
            <p className="mt-0.5 max-w-xl text-xs text-kiddy-textMuted">Кто выложил, аватар и лайки.</p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/community')}
            className="shrink-0 self-start rounded-xl border border-white/[0.1] bg-white/[0.04] px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-kiddy-textSecondary transition-colors hover:border-kiddy-cherry/30 hover:text-white sm:self-auto"
          >
            Открыть раздел «Ученики»
          </button>
        </div>
        <div className="max-w-xl mx-auto w-full">
          <ProjectShowcasePanel embed postLimit={18} />
        </div>
      </section>
    </div>
  );
};
