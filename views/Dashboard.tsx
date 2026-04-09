import React, { useState, useEffect, useMemo } from 'react';
import { User } from '../types';
import { Card } from '../components/ui/Card';
import { Calendar, Users, Flame, Sparkles } from 'lucide-react';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar } from 'recharts';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useContent } from '../hooks/useContent';
import { useSkillData } from '../hooks/useSkillData';
import { AnimatedEmptyState } from '../components/ui/AnimatedEmptyState';
import { AnimatedIcon } from '../components/ui/AnimatedIcon';
import { AnimatedGrid } from '../components/ui/AnimatedGrid';
import { supabase } from '../services/supabase';
import { ScheduleEvent } from '../types';
import {
  PERMANENT_GROUPS,
  isInAcademicYear,
  dayOfWeek,
} from '../data/permanentSchedule';

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
  const { requireAuth, isGuest } = useAuth();
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

  const handleStartLesson = () => {
    requireAuth(() => navigate('/courses'));
  };

  if (loading && courses.length === 0) {
    return (
      <div className="space-y-8 pb-10">
        <div className="skeleton h-[350px] w-full" />
        <div className="skeleton h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-10 md:space-y-14 pb-10">
      <div className="stagger-1 relative">
        <div className="absolute -top-10 left-0 w-72 h-72 bg-kiddy-cherry/8 rounded-full blur-[120px] pointer-events-none animate-glow-pulse" />
        <div className="relative">
          <p className="text-kiddy-textMuted text-sm font-semibold tracking-widest uppercase mb-3">Добро пожаловать</p>
          <h1 className="text-4xl md:text-6xl font-display font-extrabold text-white tracking-tighter leading-[1.05]">
            {user.name.split(' ')[0]}
          </h1>
        </div>
      </div>

      {!isGuest && (
        <section className="stagger-2 grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
          <Card
            hoverEffect
            role="button"
            onClick={() => navigate('/community?v=showcase')}
            className="group cursor-pointer border border-white/[0.06] bg-kiddy-surfaceElevated/60 p-6 transition-all hover:border-kiddy-cherry/25"
          >
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-kiddy-cherry/25 bg-kiddy-cherry/10 text-kiddy-cherry transition-transform group-hover:scale-105">
                <Sparkles size={22} strokeWidth={2} />
              </div>
              <div className="min-w-0">
                <h3 className="font-display text-lg font-bold text-white tracking-tight">Витрина проектов</h3>
                <p className="mt-1 text-sm text-kiddy-textMuted leading-relaxed">
                  Лента проверенных работ одноклассников. Выложить свой проект можно в профиле — здесь только просмотр.
                </p>
                <span className="mt-3 inline-block text-xs font-bold uppercase tracking-wider text-kiddy-cherry">Открыть ленту →</span>
              </div>
            </div>
          </Card>
          <Card className="border border-white/[0.06] bg-kiddy-surfaceElevated/60 p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-orange-500/30 bg-orange-500/10 text-orange-300">
                <Flame size={22} strokeWidth={2} />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-display text-lg font-bold text-white tracking-tight">Серия дней</h3>
                <p className="mt-1 font-display text-3xl font-bold text-white tabular-nums">
                  {user.streakCurrent ?? 0}{' '}
                  <span className="text-base font-semibold text-kiddy-textMuted">
                    {(user.streakCurrent ?? 0) % 10 === 1 && (user.streakCurrent ?? 0) % 100 !== 11
                      ? 'день'
                      : [2, 3, 4].includes((user.streakCurrent ?? 0) % 10) && ![12, 13, 14].includes((user.streakCurrent ?? 0) % 100)
                        ? 'дня'
                        : 'дней'}
                  </span>
                </p>
                <p className="mt-2 text-xs text-kiddy-textMuted leading-relaxed">
                  Заходи в приложение каждый день, чтобы не сбрасывать огонёк. Цели:{' '}
                  <span className="text-kiddy-textSecondary">3</span>,{' '}
                  <span className="text-kiddy-textSecondary">7</span>,{' '}
                  <span className="text-kiddy-textSecondary">14</span> и{' '}
                  <span className="text-kiddy-textSecondary">30</span> дней подряд. Рекорд:{' '}
                  <span className="font-bold text-white">{user.streakLongest ?? 0}</span>.
                </p>
              </div>
            </div>
          </Card>
        </section>
      )}

      <section className="grid grid-cols-1 lg:grid-cols-3 2xl:grid-cols-4 gap-6 md:gap-8 stagger-3">
        <div className="lg:col-span-2 2xl:col-span-3">
          {loadError ? (
            <Card className="min-h-[400px] flex flex-col items-center justify-center text-center p-8">
              <p className="text-kiddy-textSecondary font-medium mb-4">{loadError}</p>
              <button onClick={retryLoad} className="btn-cta px-6 py-3 rounded-full text-sm font-bold">
                Повторить
              </button>
            </Card>
          ) : activeCourse ? (
            <div
              className="card-premium relative overflow-hidden group cursor-pointer min-h-[400px] flex flex-col justify-end"
              onClick={handleStartLesson}
              role="button"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-kiddy-cherryDim to-transparent opacity-50 pointer-events-none" />
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-32 bg-kiddy-cherryGlow blur-[64px] opacity-20 pointer-events-none group-hover:opacity-40 transition-opacity duration-500" />
              <div className="absolute inset-0 w-full h-full rounded-[inherit] overflow-hidden pointer-events-none">
                <img
                  src={activeCourse.coverImage}
                  alt=""
                  className="w-full h-full object-cover opacity-40 group-hover:opacity-50 group-hover:scale-105 transition-all duration-[800ms] cubic-bezier(0.16, 1, 0.3, 1)"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/60 to-transparent" />
                <AnimatedGrid />
              </div>
              <div className="relative z-10 p-8 md:p-12 flex flex-col md:flex-row md:items-end justify-between gap-8 mt-auto h-full">
                <div className="max-w-xl">
                  <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.08] backdrop-blur-xl border border-white/[0.1] text-white text-[10px] uppercase font-bold tracking-widest mb-6">
                    {isGuest ? 'Пробный урок' : 'Продолжить'}
                  </span>
                  {isGuest && (
                    <p className="text-kiddy-cherry/90 text-sm font-semibold mb-2">Войдите, чтобы сохранять прогресс</p>
                  )}
                  <h2 className="font-display font-extrabold text-4xl md:text-5xl text-white tracking-tighter mb-3 leading-tight">
                    {nextLesson?.title || 'Продолжить обучение'}
                  </h2>
                  <p className="text-kiddy-textSecondary font-medium text-lg">{activeCourse.title}</p>
                </div>
                <button className="btn-cta shrink-0 w-16 h-16 md:w-20 md:h-20 flex items-center justify-center shadow-2xl rounded-full group-hover:scale-105 transition-transform duration-500 ease-spring">
                  <AnimatedIcon name="play" size={28} className="ml-1" />
                </button>
              </div>
            </div>
          ) : (
            <Card className="min-h-[400px] flex flex-col items-center justify-center text-center">
              <AnimatedEmptyState message="Курсы пока не добавлены" />
            </Card>
          )}
        </div>

        <div>
          <Card className="h-full flex flex-col">
            <h3 className="font-display font-bold text-xl text-white tracking-tight mb-1">Навыки</h3>
            <p className="text-kiddy-textMuted text-xs mb-6">По твоим курсам</p>
            <div className="flex-1 min-h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="65%" data={skillData}>
                  <PolarGrid stroke="rgba(255,255,255,0.08)" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#a1a1aa', fontSize: 11, fontWeight: 600 }} />
                  <Radar name="User" dataKey="A" stroke="#e6002b" fill="#e6002b" fillOpacity={0.2} strokeWidth={2} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-6 pt-6 border-t border-white/[0.04] flex justify-between items-center">
              <span className="text-sm font-semibold text-kiddy-textSecondary tracking-wide">Уровень</span>
              <span className="font-display font-bold text-white text-3xl">{user.level}</span>
            </div>
          </Card>
        </div>
      </section>

      <section className="stagger-4">
        <div className="flex items-center justify-between mb-8">
          <h3 className="font-display font-bold text-2xl text-white tracking-tight">Ближайшие занятия</h3>
          <button onClick={() => navigate('/schedule')} className="text-kiddy-cherry text-xs font-bold hover:underline transition-all">
            Всё расписание →
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {upcomingEvents.length === 0 ? (
            <Card className="p-8 text-center">
              <Calendar className="text-kiddy-textMuted mx-auto mb-3" size={32} />
              <p className="text-kiddy-textMuted font-medium">Пока нет занятий в расписании</p>
            </Card>
          ) : (
            upcomingEvents.map((ev, i) => {
              const live = isDashboardEventLive(ev, now);
              return (
              <Card
                key={ev.id}
                hoverEffect
                className={`flex items-start gap-4 md:gap-5 group min-w-0 ${
                  live ? 'bg-emerald-500/[0.08] border border-emerald-500/25' : ''
                }`}
                style={{ animation: `fade-in-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) both`, animationDelay: `${0.3 + i * 0.06}s` }}
              >
                <div
                  className={`mt-0.5 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border transition-all duration-400 group-hover:scale-110 md:h-14 md:w-14 ${
                    live
                      ? 'border-emerald-500/35 bg-emerald-500/12 group-hover:border-emerald-400/45 group-hover:bg-emerald-500/18'
                      : ev.isPermanent
                        ? 'border-kiddy-cherry/30 bg-kiddy-cherry/12 group-hover:border-kiddy-cherry/45 group-hover:bg-kiddy-cherry/18'
                        : 'border-white/[0.04] bg-white/[0.03] group-hover:border-kiddy-cherry/20 group-hover:bg-kiddy-cherry/10'
                  }`}
                >
                  {ev.isPermanent ? (
                    <Users className={`transition-colors duration-300 ${live ? 'text-emerald-300 group-hover:text-emerald-200' : 'text-white group-hover:text-kiddy-cherry'}`} size={22} strokeWidth={1.5} />
                  ) : (
                    <Calendar className={`transition-colors duration-300 ${live ? 'text-emerald-300 group-hover:text-emerald-200' : 'text-white group-hover:text-kiddy-cherry'}`} size={22} strokeWidth={1.5} />
                  )}
                </div>
                <div className="min-w-0 flex-1 overflow-hidden">
                  <p className={`font-bold text-base line-clamp-2 break-words ${live ? 'text-emerald-300' : 'text-white'}`}>{ev.title}</p>
                  <p className={`text-sm font-semibold ${live ? 'text-emerald-400' : 'text-kiddy-cherry'}`}>
                    {DAY_NAMES[ev.day_of_week] ?? ''} {ev.time_start}
                    {ev.time_end ? ` – ${ev.time_end}` : ''}
                  </p>
                  {ev.location && <p className="text-kiddy-textMuted text-xs mt-0.5 truncate">{ev.location}</p>}
                </div>
              </Card>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
};
