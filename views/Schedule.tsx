import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { AnimatedEmptyState } from '../components/ui/AnimatedEmptyState';
import { ChevronLeft, ChevronRight, MapPin, Users } from 'lucide-react';
import type { ScheduleEvent } from '../types';
import {
  PERMANENT_GROUPS,
  isInAcademicYear,
  getMonday,
  addDays,
  isSameDay,
  dayOfWeek,
  formatWeekRange,
} from '../data/permanentSchedule';

const DAY_NAMES = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];

type SlideDir = 'left' | 'right' | null;

interface MergedEvent {
  id: string;
  time_start: string;
  time_end?: string;
  title: string;
  description?: string;
  location?: string;
  isPermanent: boolean;
}

function pluralLessons(n: number): string {
  if (n % 10 === 1 && n % 100 !== 11) return 'занятие';
  if (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)) return 'занятия';
  return 'занятий';
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function isEventLive(ev: MergedEvent, now: Date, isToday: boolean): boolean {
  if (!isToday || !ev.time_end) return false;
  const nowMin = now.getHours() * 60 + now.getMinutes();
  return nowMin >= timeToMinutes(ev.time_start) && nowMin < timeToMinutes(ev.time_end);
}

export const Schedule: React.FC = () => {
  const today = useMemo(() => new Date(), []);
  const [weekOffset, setWeekOffset] = useState(0);
  const [dbEvents, setDbEvents] = useState<ScheduleEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [slideDir, setSlideDir] = useState<SlideDir>(null);
  const [animKey, setAnimKey] = useState(0);
  const isAnimating = useRef(false);

  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  const navigate = useCallback((delta: number) => {
    if (isAnimating.current) return;
    isAnimating.current = true;
    setSlideDir(delta > 0 ? 'left' : 'right');
    setTimeout(() => {
      setWeekOffset((w) => w + delta);
      setSlideDir(null);
      setAnimKey((k) => k + 1);
      isAnimating.current = false;
    }, 250);
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await supabase
          .from('schedule_events')
          .select('*')
          .order('day_of_week')
          .order('sort_order')
          .order('time_start');
        setDbEvents(data || []);
      } catch (_) { /* ignore */ }
      setLoading(false);
    };
    load();
  }, []);

  const monday = useMemo(() => addDays(getMonday(today), weekOffset * 7), [today, weekOffset]);
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(monday, i)), [monday]);
  const weekLabel = useMemo(() => formatWeekRange(weekDays[0], weekDays[6]), [weekDays]);
  const isThisWeek = weekOffset === 0;

  const getEventsForDay = (date: Date): MergedEvent[] => {
    const dow = dayOfWeek(date);
    const events: MergedEvent[] = [];

    if (isInAcademicYear(date)) {
      PERMANENT_GROUPS
        .filter((g) => g.day === dow)
        .forEach((g, i) => {
          events.push({
            id: `perm-${g.day}-${i}`,
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
        events.push({
          id: e.id,
          time_start: e.time_start,
          time_end: e.time_end,
          title: e.title,
          description: e.description,
          location: e.location,
          isPermanent: false,
        });
      });

    events.sort((a, b) => a.time_start.localeCompare(b.time_start));
    return events;
  };

  if (loading) {
    return (
      <div className="animate-fade-in flex flex-col items-center justify-center min-h-[60vh]">
        <AnimatedEmptyState message="Загружаем расписание" />
      </div>
    );
  }

  return (
    <div className="animate-slide-up w-full max-w-none pb-24">
      {/* ─── Week nav ─── */}
      <div className="mb-10">
        <p className="text-kiddy-textMuted text-[10px] font-bold uppercase tracking-[0.3em] mb-2">
          Расписание
        </p>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] hover:border-white/[0.1] transition-all active:scale-95"
          >
            <ChevronLeft size={20} className="text-white" />
          </button>

          <div className="flex-1 text-center overflow-hidden">
            <h1
              key={`label-${weekOffset}`}
              className="text-2xl md:text-3xl font-display font-bold text-white tracking-tight leading-tight animate-[fade-in-up_0.35s_cubic-bezier(0.16,1,0.3,1)_both]"
            >
              {weekLabel}
            </h1>
            {isThisWeek && (
              <span className="text-kiddy-cherry text-[10px] font-bold uppercase tracking-widest">
                Эта неделя
              </span>
            )}
          </div>

          <button
            onClick={() => navigate(1)}
            className="p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] hover:border-white/[0.1] transition-all active:scale-95"
          >
            <ChevronRight size={20} className="text-white" />
          </button>
        </div>

        {!isThisWeek && (
          <button
            onClick={() => {
              if (isAnimating.current) return;
              isAnimating.current = true;
              setSlideDir(weekOffset > 0 ? 'right' : 'left');
              setTimeout(() => {
                setWeekOffset(0);
                setSlideDir(null);
                setAnimKey((k) => k + 1);
                isAnimating.current = false;
              }, 250);
            }}
            className="mt-3 mx-auto block text-kiddy-cherry text-xs font-bold hover:underline transition-all"
          >
            ← Вернуться к текущей неделе
          </button>
        )}
      </div>

      {/* ─── Days ─── */}
      <div
        key={animKey}
        className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-5 transition-[opacity,transform] duration-[250ms] ease-[cubic-bezier(0.16,1,0.3,1)]"
        style={
          slideDir
            ? {
                opacity: 0,
                transform: `translateX(${slideDir === 'left' ? '-40px' : '40px'})`,
              }
            : {
                animation: 'week-slide-in 0.4s cubic-bezier(0.16, 1, 0.3, 1) both',
              }
        }
      >
        {weekDays.map((date, dayIdx) => {
          const isToday = isSameDay(date, today);
          const dow = dayOfWeek(date);
          const events = getEventsForDay(date);
          const isPast = date < today && !isToday;

          return (
            <div
              key={dayIdx}
              className={`rounded-2xl border transition-all duration-300 ${
                isToday
                  ? 'bg-kiddy-cherry/[0.06] border-kiddy-cherry/25 shadow-[0_0_48px_-12px_rgba(230,0,43,0.12)]'
                  : isPast
                    ? 'bg-kiddy-surfaceElevated/40 border-white/[0.04] opacity-50'
                    : 'bg-kiddy-surfaceElevated/80 border-white/[0.06] hover:border-white/[0.1]'
              }`}
              style={{
                animation: `reveal-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) both`,
                animationDelay: `${dayIdx * 0.04}s`,
              }}
            >
              {/* Day header */}
              <div className="flex items-center justify-between p-5 pb-0">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg transition-colors ${
                      isToday
                        ? 'bg-kiddy-cherry text-white shadow-lg shadow-kiddy-cherry/30'
                        : 'bg-white/[0.04] text-kiddy-textSecondary'
                    }`}
                  >
                    {date.getDate()}
                  </div>
                  <div>
                    <span className={`font-bold text-sm ${isToday ? 'text-kiddy-cherry' : 'text-white'}`}>
                      {DAY_NAMES[dow - 1]}
                    </span>
                    {isToday && (
                      <span className="block text-[10px] text-kiddy-cherry font-bold uppercase tracking-widest">
                        Сегодня
                      </span>
                    )}
                  </div>
                </div>
                {events.length > 0 && (
                  <span className="text-kiddy-textMuted text-xs font-medium">
                    {events.length} {pluralLessons(events.length)}
                  </span>
                )}
              </div>

              {/* Events */}
              <div className="p-5 pt-3">
                {events.length === 0 ? (
                  <p className="text-zinc-600 text-sm pl-[52px]">Нет занятий</p>
                ) : (
                  <div className="space-y-2">
                    {events.map((ev, i) => {
                      const live = isEventLive(ev, now, isToday);
                      return (
                        <div
                          key={ev.id}
                          className={`flex items-start gap-4 rounded-xl px-4 py-3 transition-all duration-200 ${
                            live
                              ? 'bg-emerald-500/[0.08] border border-emerald-500/25'
                              : ev.isPermanent
                                ? 'bg-white/[0.025] border border-white/[0.05] hover:border-white/[0.1]'
                                : 'bg-kiddy-cherry/[0.06] border border-kiddy-cherry/20 hover:border-kiddy-cherry/30'
                          }`}
                          style={{
                            animation: `fade-in-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) both`,
                            animationDelay: `${dayIdx * 0.04 + i * 0.03 + 0.1}s`,
                          }}
                        >
                          <div className="w-16 shrink-0 pt-0.5">
                            <span
                              className={`font-mono font-bold text-sm ${
                                live
                                  ? 'text-emerald-400'
                                  : ev.isPermanent
                                    ? 'text-kiddy-textSecondary'
                                    : 'text-kiddy-cherry'
                              }`}
                            >
                              {ev.time_start}
                            </span>
                            {ev.time_end && (
                              <span className={`font-mono text-[11px] block ${live ? 'text-emerald-400/50' : 'text-kiddy-textMuted'}`}>
                                {ev.time_end}
                              </span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0 overflow-hidden">
                            <div className="flex min-w-0 items-start gap-2">
                              <span className={`min-w-0 flex-1 break-words text-sm font-semibold leading-snug line-clamp-2 ${live ? 'text-emerald-300' : 'text-white'}`}>
                                {ev.title}
                              </span>
                              {ev.isPermanent && !live && (
                                <Users size={14} className="mt-0.5 shrink-0 text-kiddy-textMuted" aria-hidden />
                              )}
                            </div>
                            {ev.description && (
                              <p className="text-kiddy-textMuted text-xs mt-0.5 truncate">{ev.description}</p>
                            )}
                            {ev.location && (
                              <p className="text-kiddy-textMuted text-xs mt-0.5 flex items-center gap-1">
                                <MapPin size={10} /> {ev.location}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
