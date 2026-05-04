import React, { useState, useEffect, useMemo } from 'react';
import { User, Role, ScheduleEvent } from '../types';
import { Card } from '../components/ui/Card';
import { Calendar, Users, Flame, Sparkles, Loader2, Zap, BookOpen } from 'lucide-react';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar } from 'recharts';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useContent } from '../hooks/useContent';
import { useSkillData } from '../hooks/useSkillData';
import { AnimatedEmptyState } from '../components/ui/AnimatedEmptyState';
import { AnimatedIcon } from '../components/ui/AnimatedIcon';
import { AnimatedGrid } from '../components/ui/AnimatedGrid';
import { UserAvatar } from '../components/UserAvatar';
import { supabase } from '../services/supabase';
import {
  PERMANENT_GROUPS,
  isInAcademicYear,
  dayOfWeek,
} from '../data/permanentSchedule';
import { ProjectShowcasePanel } from './ProjectShowcasePanel';

/** Боковой блок на главной: быстрый вход к публикации / сообществу (согласовано как «лёгкий» якорь, не дублирует форму). */
function ShowcaseHomeWidget() {
  const { user, openAuthModal, isGuest } = useAuth();
  const navigate = useNavigate();

  if (isGuest || user.id === 'guest') {
    return (
      <Card className="border border-white/[0.08] bg-kiddy-surfaceElevated/70 p-5">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-kiddy-cherry/25 bg-kiddy-cherry/10 text-kiddy-cherry">
          <Sparkles size={20} strokeWidth={2} />
        </div>
        <h3 className="mt-4 font-display text-lg font-bold text-white tracking-tight">Свой проект</h3>
        <p className="mt-2 text-sm leading-relaxed text-kiddy-textMuted">
          Войди как ученик — сможешь лайкать посты и отправить работу на витрину из профиля.
        </p>
        <button
          type="button"
          onClick={() => openAuthModal()}
          className="mt-5 w-full rounded-xl bg-kiddy-cherry py-3 text-sm font-bold text-white transition-all hover:brightness-110"
        >
          Войти
        </button>
      </Card>
    );
  }

  if (user.role === Role.STUDENT) {
    return (
      <Card className="border border-white/[0.08] bg-kiddy-surfaceElevated/70 p-5">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-kiddy-cherry/25 bg-kiddy-cherry/10 text-kiddy-cherry">
          <Sparkles size={20} strokeWidth={2} />
        </div>
        <h3 className="mt-4 font-display text-lg font-bold text-white tracking-tight">Выложить проект</h3>
        <p className="mt-2 text-sm leading-relaxed text-kiddy-textMuted">
          Текст и медиа — в профиле. После проверки наставник опубликует пост в этой ленте.
        </p>
        <button
          type="button"
          onClick={() => navigate('/profile#showcase-submit')}
          className="mt-5 w-full rounded-xl border border-kiddy-cherry/40 bg-kiddy-cherry/[0.14] py-3 text-sm font-bold text-white transition-all hover:border-kiddy-cherry hover:bg-kiddy-cherry/25"
        >
          Открыть форму в профиле
        </button>
        <button
          type="button"
          onClick={() => navigate('/community')}
          className="mt-3 w-full text-center text-xs font-bold uppercase tracking-wider text-kiddy-textMuted hover:text-white"
        >
          Сообщество — люди и заявки
        </button>
      </Card>
    );
  }

  if (user.role === Role.ADMIN) {
    return (
      <Card className="border border-white/[0.08] bg-kiddy-surfaceElevated/70 p-5">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-violet-500/25 bg-violet-500/10 text-violet-200">
          <Sparkles size={20} strokeWidth={2} />
        </div>
        <h3 className="mt-4 font-display text-lg font-bold text-white tracking-tight">Модерация</h3>
        <p className="mt-2 text-sm leading-relaxed text-kiddy-textMuted">
          Новые заявки на витрину принимаются во вкладке «Витрина» в админке.
        </p>
        <button
          type="button"
          onClick={() => navigate('/admin')}
          className="mt-5 w-full rounded-xl border border-white/[0.12] bg-white/[0.06] py-3 text-sm font-bold text-white hover:bg-white/[0.1]"
        >
          Открыть админку
        </button>
      </Card>
    );
  }

  return (
    <Card className="border border-white/[0.08] bg-kiddy-surfaceElevated/70 p-5">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] text-kiddy-textSecondary">
        <Users size={20} strokeWidth={2} />
      </div>
      <h3 className="mt-4 font-display text-lg font-bold text-white tracking-tight">Сообщество</h3>
      <p className="mt-2 text-sm leading-relaxed text-kiddy-textMuted">
        Полная лента, список учеников и друзья — в разделе «Сообщество».
      </p>
      <button
        type="button"
        onClick={() => navigate('/community')}
        className="mt-5 w-full rounded-xl border border-kiddy-cherry/35 bg-kiddy-cherry/[0.12] py-3 text-sm font-bold text-white hover:bg-kiddy-cherry/20"
      >
        Перейти в сообщество
      </button>
    </Card>
  );
}

interface DashboardProps {
  user: User;
}

const DAY_NAMES: Record<number, string> = { 1: 'Пн', 2: 'Вт', 3: 'Ср', 4: 'Чт', 5: 'Пт', 6: 'Сб', 7: 'Вс' };

interface DashEvent {
  id: string;
  day_of_week: number;
  time_start: string;
  time_end?: string;
  title: string;
  location?: string;
  isPermanent: boolean;
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

/** Совпадает с логикой Schedule.isEventLive: сегодня по day_of_week и окно time_start–time_end. */
function isDashboardEventLive(ev: DashEvent, now: Date): boolean {
  if (dayOfWeek(now) !== ev.day_of_week || !ev.time_end) return false;
  const nowMin = now.getHours() * 60 + now.getMinutes();
  return nowMin >= timeToMinutes(ev.time_start) && nowMin < timeToMinutes(ev.time_end);
}

function buildUpcomingEvents(dbEvents: ScheduleEvent[]): DashEvent[] {
  const now = new Date();
  const todayDow = dayOfWeek(now);
  const academic = isInAcademicYear(now);
  const result: DashEvent[] = [];

  for (let offset = 0; offset < 7 && result.length < 6; offset++) {
    const dow = ((todayDow - 1 + offset) % 7) + 1;

    if (academic) {
      PERMANENT_GROUPS
        .filter((g) => g.day === dow)
        .forEach((g, i) => {
          result.push({
            id: `perm-${g.day}-${i}`,
            day_of_week: dow,
            time_start: g.time,
            time_end: g.end,
            title: g.title,
            isPermanent: true,
          });
        });
    }

    dbEvents
      .filter((e) => e.day_of_week === dow)
      .forEach((e) => {
        result.push({
          id: e.id,
          day_of_week: dow,
          time_start: e.time_start,
          time_end: e.time_end,
          title: e.title,
          location: e.location,
          isPermanent: false,
        });
      });
  }

  return result.slice(0, 6);
}

export const Dashboard: React.FC<DashboardProps> = ({ user }) => {
  const { requireAuth, isGuest, openAuthModal } = useAuth();
  const { courses, loading, loadError, retryLoad } = useContent(user?.id !== 'guest' ? user?.id : undefined);
  const skillData = useSkillData(courses);
  const [dbScheduleEvents, setDbScheduleEvents] = useState<ScheduleEvent[]>([]);
  const [now, setNow] = useState(() => new Date());
  const navigate = useNavigate();

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);
  const activeCourse = courses[0];
  const nextLesson = activeCourse?.modules?.flatMap(m => m.lessons).find(l => !l.isCompleted && !l.locked);

  useEffect(() => {
    void supabase.from('schedule_events').select('*').order('day_of_week').order('sort_order').order('time_start')
      .then(({ data }) => setDbScheduleEvents(data || []))
      .then(() => {}, () => setDbScheduleEvents([]));
  }, []);

  const upcomingEvents = useMemo(() => buildUpcomingEvents(dbScheduleEvents), [dbScheduleEvents]);

  const headerDate = useMemo(() => {
    const s = now.toLocaleDateString('ru-RU', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
    return s.charAt(0).toUpperCase() + s.slice(1);
  }, [now]);

  const welcomeSubtitle = useMemo(() => {
    if (loadError) return 'Курсы не загрузились — кнопка «Повторить» справа в блоке урока.';
    if (isGuest) return 'Загляни в курсы или войди, чтобы сохранять прогресс, ленту и друзей.';
    if (activeCourse && nextLesson) {
      return `В очереди: «${nextLesson.title}» · ${activeCourse.title}`;
    }
    if (activeCourse) return `Продолжай: ${activeCourse.title}`;
    return 'Загляни в библиотеку курсов и выбери, с чего начать сегодня.';
  }, [isGuest, activeCourse, nextLesson, loadError]);

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

  const handleStartLesson = () => {
    requireAuth(() => navigate('/courses'));
  };

  if (loading && courses.length === 0) {
    return (
      <div className="flex min-h-[min(420px,70vh)] flex-col items-center justify-center gap-4 pb-10">
        <Loader2 className="animate-spin text-kiddy-cherry" size={40} strokeWidth={2} />
        <p className="text-center text-sm font-medium text-kiddy-textMuted">Загружаем курсы…</p>
        <div className="mt-4 w-full max-w-2xl space-y-3">
          <div className="skeleton h-40 w-full rounded-2xl" />
          <div className="skeleton h-32 w-full rounded-2xl" />
        </div>
      </div>
    );
  }
  return (
    <div className="pb-8 md:pb-10">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-5">
        {/* Левая колонка: на десктопе слева; на мобиле — после ленты */}
        <aside className="order-2 flex w-full shrink-0 flex-col gap-4 lg:order-1 lg:w-[min(100%,260px)] lg:self-start lg:sticky lg:top-20 lg:z-0 lg:max-h-[min(calc(100vh-5rem),920px)] lg:overflow-y-auto lg:overscroll-contain">
          <Card className="relative overflow-hidden border border-white/[0.1] bg-gradient-to-br from-white/[0.06] via-kiddy-surfaceElevated/40 to-black/25 p-4 shadow-lg stagger-2">
            <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-kiddy-cherry/15 blur-3xl" />
            <div className="relative flex gap-3">
              <UserAvatar user={{ id: user.id, name: user.name, avatar: user.avatar }} size="lg" />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-kiddy-cherry">Главная</p>
                  <time className="text-[10px] font-medium text-zinc-500 tabular-nums" dateTime={now.toISOString()}>
                    {headerDate}
                  </time>
                </div>
                <h1 className="mt-1 font-display text-2xl font-extrabold leading-tight tracking-tight text-white">
                  {user.name.split(' ')[0]}
                </h1>
                <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-kiddy-textSecondary">{welcomeSubtitle}</p>
              </div>
            </div>
            <div className="relative mt-3 flex flex-wrap gap-1.5">
              <span className="inline-flex items-center gap-1 rounded-full border border-white/[0.1] bg-black/25 px-2 py-0.5 text-[10px] font-bold text-white">
                Ур. {user.level}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-white/[0.1] bg-black/25 px-2 py-0.5 text-[10px] font-bold text-zinc-200">
                <Zap size={12} className="text-kiddy-cherry" aria-hidden />
                {(user.xp ?? 0).toLocaleString('ru-RU')} XP
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-white/[0.1] bg-black/25 px-2 py-0.5 text-[10px] font-bold text-zinc-200">
                <BookOpen size={12} className="text-kiddy-cherry/90" aria-hidden />
                {courses.length}{' '}
                {courses.length === 1 ? 'курс' : courses.length > 1 && courses.length < 5 ? 'курса' : 'курсов'}
              </span>
            </div>
            <div className="relative mt-3 grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={handleGoCourses}
                className="flex flex-col items-center gap-1 rounded-xl border border-kiddy-cherry/35 bg-kiddy-cherry/[0.12] py-2.5 text-[10px] font-bold uppercase tracking-wide text-white transition-colors hover:bg-kiddy-cherry/22"
              >
                <BookOpen size={16} strokeWidth={2} />
                Курсы
              </button>
              <button
                type="button"
                onClick={handleGoSchedule}
                title="Расписание"
                className="flex flex-col items-center gap-1 rounded-xl border border-white/[0.1] bg-white/[0.04] py-2.5 text-[10px] font-bold uppercase tracking-wide text-kiddy-textSecondary transition-colors hover:border-white/20 hover:text-white"
              >
                <Calendar size={16} strokeWidth={2} />
                Распис.
              </button>
              <button
                type="button"
                onClick={handleGoCommunity}
                className="flex flex-col items-center gap-1 rounded-xl border border-white/[0.1] bg-white/[0.04] py-2.5 text-[10px] font-bold uppercase tracking-wide text-kiddy-textSecondary transition-colors hover:border-white/20 hover:text-white"
              >
                <Sparkles size={16} strokeWidth={2} />
                Люди
              </button>
            </div>
          </Card>

          {!isGuest && (
            <Card className="border border-orange-500/20 bg-gradient-to-b from-orange-500/[0.1] to-black/20 p-4 stagger-2">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-orange-400/35 bg-orange-500/15 text-orange-200">
                  <Flame size={20} strokeWidth={2} />
                </div>
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-orange-200/90">Серия дней</p>
                  <p className="font-display text-xl font-bold tabular-nums text-white">
                    {user.streakCurrent ?? 0}
                    <span className="ml-1 text-xs font-semibold text-kiddy-textMuted">
                      {(user.streakCurrent ?? 0) % 10 === 1 && (user.streakCurrent ?? 0) % 100 !== 11
                        ? 'день'
                        : [2, 3, 4].includes((user.streakCurrent ?? 0) % 10) &&
                            ![12, 13, 14].includes((user.streakCurrent ?? 0) % 100)
                          ? 'дня'
                          : 'дней'}
                    </span>
                  </p>
                  <p className="text-[10px] text-kiddy-textMuted">
                    Рекорд: <span className="font-bold text-white">{user.streakLongest ?? 0}</span>
                  </p>
                </div>
              </div>
            </Card>
          )}

          <Card className="border border-white/[0.06] bg-kiddy-surfaceElevated/50 p-4 stagger-2">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="font-display text-sm font-bold text-white">Ближайшее</h3>
              <button
                type="button"
                onClick={handleGoSchedule}
                className="shrink-0 text-[10px] font-bold text-kiddy-cherry hover:underline"
              >
                Всё →
              </button>
            </div>
            {upcomingEvents.length === 0 ? (
              <p className="text-center text-xs text-kiddy-textMuted">Пока пусто</p>
            ) : (
              <ul className="space-y-2">
                {upcomingEvents.slice(0, 4).map((ev, i) => {
                  const live = isDashboardEventLive(ev, now);
                  return (
                    <li key={ev.id}>
                      <Card
                        hoverEffect
                        className={`flex items-start gap-2.5 p-2.5 ${
                          live ? 'border border-emerald-500/25 bg-emerald-500/[0.06]' : ''
                        }`}
                        style={{
                          animation: 'fade-in-up 0.45s cubic-bezier(0.16, 1, 0.3, 1) both',
                          animationDelay: `${i * 0.05}s`,
                        }}
                      >
                        <div
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${
                            live
                              ? 'border-emerald-500/30 bg-emerald-500/10'
                              : ev.isPermanent
                                ? 'border-kiddy-cherry/25 bg-kiddy-cherry/10'
                                : 'border-white/[0.06] bg-white/[0.03]'
                          }`}
                        >
                          {ev.isPermanent ? (
                            <Users className={live ? 'text-emerald-300' : 'text-white'} size={14} strokeWidth={1.5} />
                          ) : (
                            <Calendar className={live ? 'text-emerald-300' : 'text-white'} size={14} strokeWidth={1.5} />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p
                            className={`line-clamp-2 text-xs font-bold leading-snug ${
                              live ? 'text-emerald-300' : 'text-white'
                            }`}
                          >
                            {ev.title}
                          </p>
                          <p className={`mt-0.5 text-[11px] font-semibold ${live ? 'text-emerald-400' : 'text-kiddy-cherry'}`}>
                            {DAY_NAMES[ev.day_of_week] ?? ''} {ev.time_start}
                            {ev.time_end ? ` – ${ev.time_end}` : ''}
                          </p>
                        </div>
                      </Card>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </aside>

        {/* Центр: лента в первой зоне экрана */}
        <main className="order-1 min-w-0 flex-1 lg:order-2">
          <section className="stagger-1 space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-kiddy-cherry">Сообщество</p>
                <h2 className="font-display text-xl font-bold tracking-tight text-white md:text-2xl">Лента проектов</h2>
                <p className="mt-0.5 max-w-xl text-xs text-kiddy-textMuted">Кто выложил, аватар и лайки — как в соцсети.</p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/community?v=showcase')}
                className="shrink-0 rounded-xl border border-white/[0.1] bg-white/[0.04] px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-kiddy-textSecondary transition-colors hover:border-kiddy-cherry/30 hover:text-white"
              >
                Ещё в сообществе
              </button>
            </div>
            <ProjectShowcasePanel embed postLimit={18} />
          </section>
        </main>

        {/* Правая колонка */}
        <aside className="order-3 flex w-full shrink-0 flex-col gap-4 lg:w-[min(100%,292px)] lg:self-start lg:sticky lg:top-20 lg:z-0 lg:max-h-[min(calc(100vh-5rem),920px)] lg:overflow-y-auto lg:overscroll-contain">
          {loadError ? (
            <Card className="flex min-h-[200px] flex-col items-center justify-center p-5 text-center stagger-3">
              <p className="text-sm text-kiddy-textSecondary">{loadError}</p>
              <button onClick={retryLoad} className="btn-cta mt-3 rounded-full px-4 py-2 text-xs font-bold">
                Повторить
              </button>
            </Card>
          ) : activeCourse ? (
            <div
              className="card-premium group relative flex min-h-[220px] cursor-pointer flex-col justify-end overflow-hidden stagger-3"
              onClick={handleStartLesson}
              role="button"
            >
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-kiddy-cherryDim to-transparent opacity-50" />
              <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]">
                <img
                  src={activeCourse.coverImage}
                  alt=""
                  className="h-full w-full object-cover opacity-35 transition-all duration-700 group-hover:scale-105 group-hover:opacity-45"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/70 to-transparent" />
                <AnimatedGrid />
              </div>
              <div className="relative z-10 flex items-end justify-between gap-3 p-4">
                <div className="min-w-0">
                  <span className="mb-1.5 inline-flex rounded-full border border-white/[0.1] bg-white/[0.08] px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-white">
                    {isGuest ? 'Проба' : 'Дальше'}
                  </span>
                  <h2 className="line-clamp-2 font-display text-lg font-extrabold leading-tight tracking-tight text-white md:text-xl">
                    {nextLesson?.title || 'Продолжить'}
                  </h2>
                  <p className="mt-0.5 truncate text-xs font-medium text-kiddy-textSecondary">{activeCourse.title}</p>
                </div>
                <button
                  type="button"
                  className="btn-cta flex h-11 w-11 shrink-0 items-center justify-center rounded-full shadow-lg transition-transform group-hover:scale-105"
                  aria-label="Открыть урок"
                >
                  <AnimatedIcon name="play" size={20} className="ml-0.5" />
                </button>
              </div>
            </div>
          ) : (
            <Card className="flex min-h-[180px] flex-col items-center justify-center p-5 text-center stagger-3">
              <AnimatedEmptyState message="Курсы скоро появятся" />
            </Card>
          )}

          <Card className="flex flex-col border border-white/[0.06] bg-kiddy-surfaceElevated/60 p-4 stagger-3">
            <h3 className="font-display text-sm font-bold text-white">Навыки</h3>
            <p className="text-[10px] text-kiddy-textMuted">По курсам</p>
            <div className="mt-2 h-[180px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="58%" data={skillData}>
                  <PolarGrid stroke="rgba(255,255,255,0.08)" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#a1a1aa', fontSize: 9, fontWeight: 600 }} />
                  <Radar name="User" dataKey="A" stroke="#e6002b" fill="#e6002b" fillOpacity={0.2} strokeWidth={2} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 flex items-center justify-between border-t border-white/[0.04] pt-3">
              <span className="text-xs font-semibold text-kiddy-textSecondary">Уровень</span>
              <span className="font-display text-2xl font-bold text-white">{user.level}</span>
            </div>
          </Card>

          <div className="stagger-3">
            <ShowcaseHomeWidget />
          </div>
        </aside>
      </div>
    </div>
  );
};
