import React, { useMemo, useRef } from 'react';
import { Role, User } from '../types';
import { Card } from '../components/ui/Card';
import { Sparkles, Loader2, Zap, BookOpen, Flame, CalendarDays, Trophy } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useNavigate } from 'react-router-dom';
import { useContent } from '../hooks/useContent';
import { UserAvatar } from '../components/UserAvatar';
import { ProjectShowcasePanel } from './ProjectShowcasePanel';
import { RotatingLaptop } from '../components/ui/RotatingLaptop';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(useGSAP);

interface DashboardProps {
  user: User;
}

export const Dashboard: React.FC<DashboardProps> = ({ user }) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const { isGuest, openAuthModal } = useAuth();
  const { showToast } = useToast();
  const { courses, loading, loadError, retryLoad } = useContent(user?.id !== 'guest' ? user?.id : undefined);
  const navigate = useNavigate();

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

  useGSAP(() => {
    const mm = gsap.matchMedia();

    mm.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.from('.dash-motion', {
        autoAlpha: 0,
        y: 28,
        scale: 0.98,
        duration: 0.8,
        stagger: 0.08,
        ease: 'power3.out',
      });

      const hero = rootRef.current?.querySelector<HTMLElement>('[data-hero-card]');
      if (!hero) return;

      const rotateX = gsap.quickTo(hero, 'rotationX', { duration: 0.45, ease: 'power3.out' });
      const rotateY = gsap.quickTo(hero, 'rotationY', { duration: 0.45, ease: 'power3.out' });
      const lift = gsap.quickTo(hero, 'y', { duration: 0.45, ease: 'power3.out' });

      const onMove = (event: MouseEvent) => {
        const rect = hero.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width - 0.5;
        const y = (event.clientY - rect.top) / rect.height - 0.5;
        rotateX(y * -5);
        rotateY(x * 6);
        lift(-4);
      };
      const onLeave = () => {
        rotateX(0);
        rotateY(0);
        lift(0);
      };

      hero.addEventListener('mousemove', onMove);
      hero.addEventListener('mouseleave', onLeave);

      const magneticTargets = gsap.utils.toArray<HTMLElement>('.magnetic-target');
      const cleanups = magneticTargets.map((target) => {
        const xTo = gsap.quickTo(target, 'x', { duration: 0.35, ease: 'power3.out' });
        const yTo = gsap.quickTo(target, 'y', { duration: 0.35, ease: 'power3.out' });
        const move = (event: MouseEvent) => {
          const rect = target.getBoundingClientRect();
          xTo((event.clientX - rect.left - rect.width / 2) * 0.18);
          yTo((event.clientY - rect.top - rect.height / 2) * 0.22);
        };
        const leave = () => {
          xTo(0);
          yTo(0);
        };
        target.addEventListener('mousemove', move);
        target.addEventListener('mouseleave', leave);
        return () => {
          target.removeEventListener('mousemove', move);
          target.removeEventListener('mouseleave', leave);
        };
      });

      return () => {
        hero.removeEventListener('mousemove', onMove);
        hero.removeEventListener('mouseleave', onLeave);
        cleanups.forEach((cleanup) => cleanup());
      };
    });

    return () => mm.revert();
  }, { scope: rootRef, dependencies: [isGuest, courses.length, loadError] });

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
    <div ref={rootRef} className="space-y-6 pb-10 md:space-y-8">
      <section className="dash-motion relative [perspective:1200px]">
        <div className="pointer-events-none absolute -left-4 top-0 h-56 w-56 rounded-full bg-kiddy-cherry/18 blur-[90px] md:left-0" />
        <Card
          data-hero-card
          className="relative overflow-hidden border border-white/[0.14] bg-gradient-to-br from-white/[0.1] via-kiddy-surfaceElevated/70 to-black/30 p-4 shadow-neon-panel md:p-6"
        >
          <div className="pointer-events-none absolute right-0 top-0 h-full w-full bg-[radial-gradient(circle_at_76%_30%,rgba(230,0,43,0.18),transparent_34%),radial-gradient(circle_at_90%_70%,rgba(77,220,255,0.1),transparent_28%)]" />
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)] lg:items-center">
            <div className="min-w-0">
              <div className="mb-5 flex flex-wrap items-center gap-3">
                <UserAvatar user={{ id: user.id, name: user.name, avatar: user.avatar }} size="xl" />
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.32em] text-kiddy-cherry">Дети В ТОПЕ</p>
                  <p className="mt-1 text-xs font-semibold text-kiddy-textMuted">Персональная IT-траектория</p>
                </div>
              </div>

              <h1 className="max-w-3xl font-display text-4xl font-extrabold leading-[0.98] tracking-[-0.055em] text-white md:text-6xl">
                {isGuest ? 'Войди в свою лабораторию навыков' : `Привет, ${user.name.split(' ')[0]}`}
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-kiddy-textSecondary md:text-base">
                {welcomeSubtitle}
              </p>
              {loadError && (
                <button
                  type="button"
                  onClick={retryLoad}
                  className="btn-cta magnetic-target mt-4 rounded-full px-5 py-2.5 text-xs font-bold"
                >
                  Повторить загрузку
                </button>
              )}

              <div className="mt-6 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                <span className="inline-flex items-center gap-2 rounded-2xl border border-white/[0.12] bg-black/30 px-3 py-2 text-xs font-bold text-white shadow-depth">
                  <Trophy size={15} className="text-kiddy-amber" aria-hidden />
                  Ур. {user.level}
                </span>
                <span className="inline-flex items-center gap-2 rounded-2xl border border-white/[0.12] bg-black/30 px-3 py-2 text-xs font-bold text-zinc-100 shadow-depth">
                  <Zap size={15} className="text-kiddy-cherry" aria-hidden />
                  {(user.xp ?? 0).toLocaleString('ru-RU')} XP
                </span>
                {!isGuest && (
                  <span className="inline-flex items-center gap-2 rounded-2xl border border-white/[0.12] bg-black/30 px-3 py-2 text-xs font-bold text-zinc-100 shadow-depth">
                    <BookOpen size={15} className="text-kiddy-cyan" aria-hidden />
                    {courses.length}{' '}
                    {courses.length === 1 ? 'курс' : courses.length > 1 && courses.length < 5 ? 'курса' : 'курсов'}
                  </span>
                )}
                {!isGuest && (
                  <span className="inline-flex items-center gap-2 rounded-2xl border border-orange-500/25 bg-orange-500/10 px-3 py-2 text-xs font-bold text-orange-100 shadow-depth">
                    <Flame size={15} className="text-orange-300" aria-hidden />
                    {user.streakCurrent ?? 0} дн. подряд
                  </span>
                )}
              </div>

              <div className="mt-6 flex flex-wrap gap-2.5">
                <button
                  type="button"
                  onClick={handleGoCourses}
                  className="btn-cta magnetic-target inline-flex items-center gap-2 px-5 py-3 text-xs uppercase tracking-wider"
                >
                  <BookOpen size={16} strokeWidth={2} />
                  Курсы
                </button>
                <button
                  type="button"
                  onClick={handleGoSchedule}
                  className="btn-secondary magnetic-target inline-flex items-center gap-2 px-5 py-3 text-xs uppercase tracking-wider text-kiddy-textSecondary hover:text-white"
                >
                  <CalendarDays size={16} strokeWidth={2} />
                  Расписание
                </button>
                <button
                  type="button"
                  onClick={handleGoCommunity}
                  className="btn-secondary magnetic-target inline-flex items-center gap-2 px-5 py-3 text-xs uppercase tracking-wider text-kiddy-textSecondary hover:text-white"
                >
                  <Sparkles size={16} strokeWidth={2} />
                  Ученики
                </button>
              </div>
            </div>

            <div className="relative hidden min-h-[320px] lg:block">
              <div className="absolute inset-x-8 bottom-8 h-20 rounded-full bg-kiddy-cherry/25 blur-[48px]" />
              <RotatingLaptop className="relative z-10" height="340px" />
              <div className="absolute right-4 top-7 rounded-[1.5rem] border border-white/[0.12] bg-white/[0.07] px-4 py-3 shadow-depth backdrop-blur-xl">
                <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-kiddy-cyan">Live skills</p>
                <p className="mt-1 font-display text-2xl font-extrabold text-white">AI + Code</p>
              </div>
              <div className="absolute bottom-10 left-4 rounded-[1.5rem] border border-white/[0.12] bg-white/[0.07] px-4 py-3 shadow-depth backdrop-blur-xl">
                <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-kiddy-cherry">Projects</p>
                <p className="mt-1 font-display text-2xl font-extrabold text-white">Showcase</p>
              </div>
            </div>
          </div>
        </Card>
      </section>

      <section className="dash-motion space-y-4">
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
