import React, { useState, useEffect, useMemo } from 'react';
import { Role, User } from '../types';
import { Card } from '../components/ui/Card';
import { Sparkles, Loader2, Zap, BookOpen, Flame } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useNavigate } from 'react-router-dom';
import { useContent } from '../hooks/useContent';
import { UserAvatar } from '../components/UserAvatar';
import { ProjectShowcasePanel } from './ProjectShowcasePanel';

interface DashboardProps {
  user: User;
}

export const Dashboard: React.FC<DashboardProps> = ({ user }) => {
  const { isGuest, openAuthModal } = useAuth();
  const { showToast } = useToast();
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

  const handleSuggestProject = () => {
    if (isGuest) {
      openAuthModal();
      return;
    }
    if (user.role === Role.STUDENT) {
      navigate('/profile#showcase-submit');
      return;
    }
    showToast('Предложить проект на витрину могут только ученики.', 'info');
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
        <div className="pointer-events-none absolute -left-4 top-0 h-40 w-40 rounded-full bg-kiddy-cherry/10 blur-[80px] md:left-0" />
        <Card className="relative overflow-hidden border border-white/[0.1] bg-gradient-to-br from-white/[0.07] via-kiddy-surfaceElevated/50 to-black/20 p-4 shadow-[0_20px_60px_-36px_rgba(0,0,0,0.85)] md:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-5">
            <UserAvatar user={{ id: user.id, name: user.name, avatar: user.avatar }} size="xl" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-kiddy-cherry">Главная</p>
                <time className="text-xs font-medium text-zinc-500 tabular-nums" dateTime={now.toISOString()}>
                  {headerDate}
                </time>
              </div>
              <h1 className="mt-1 font-display text-2xl font-extrabold tracking-tight text-white md:text-3xl">
                {user.name}
              </h1>
              <p className="mt-1.5 text-sm leading-relaxed text-kiddy-textSecondary">{welcomeSubtitle}</p>
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
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.1] bg-black/30 px-3 py-1 text-xs font-bold text-white">
                  Ур. {user.level}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.1] bg-black/30 px-3 py-1 text-xs font-bold text-zinc-200">
                  <Zap size={14} className="text-kiddy-cherry" aria-hidden />
                  {(user.xp ?? 0).toLocaleString('ru-RU')} XP
                </span>
                {!isGuest && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.1] bg-black/30 px-3 py-1 text-xs font-bold text-zinc-200">
                    <BookOpen size={14} className="text-kiddy-cherry/90" aria-hidden />
                    {courses.length}{' '}
                    {courses.length === 1 ? 'курс' : courses.length > 1 && courses.length < 5 ? 'курса' : 'курсов'}
                  </span>
                )}
                {!isGuest && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-500/25 bg-orange-500/10 px-3 py-1 text-xs font-bold text-orange-100">
                    <Flame size={14} className="text-orange-300" aria-hidden />
                    {user.streakCurrent ?? 0} дн.
                  </span>
                )}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleGoCourses}
                  className="inline-flex items-center gap-2 rounded-xl border border-kiddy-cherry/35 bg-kiddy-cherry/[0.14] px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-white transition-colors hover:bg-kiddy-cherry/25"
                >
                  <BookOpen size={15} strokeWidth={2} />
                  Курсы
                </button>
                <button
                  type="button"
                  onClick={handleGoSchedule}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/[0.12] bg-white/[0.05] px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-kiddy-textSecondary transition-colors hover:border-white/20 hover:text-white"
                >
                  Расписание
                </button>
                <button
                  type="button"
                  onClick={handleGoCommunity}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/[0.12] bg-white/[0.05] px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-kiddy-textSecondary transition-colors hover:border-white/20 hover:text-white"
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
            onClick={handleSuggestProject}
            className="shrink-0 self-start rounded-xl border border-kiddy-cherry/35 bg-kiddy-cherry/[0.12] px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-white transition-colors hover:border-kiddy-cherry/50 hover:bg-kiddy-cherry/20 sm:self-auto"
          >
            Предложить свой проект
          </button>
        </div>
        <div className="max-w-xl mx-auto w-full">
          <ProjectShowcasePanel embed postLimit={18} />
        </div>
      </section>
    </div>
  );
};
