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

import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
gsap.registerPlugin(useGSAP);

const DAY_NAMES = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];

const EventIsland = ({ ev, live, index }: { ev: MergedEvent, live: boolean, index: number }) => {
  const [expanded, setExpanded] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const detailsRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      const details = detailsRef.current;
      if (!el || !details) return;

      gsap.killTweensOf([el, details]);

      if (expanded) {
        gsap.set(details, { display: 'block' });
        gsap.to(el, {
          height: 'auto',
          borderRadius: 24,
          backgroundColor: live ? 'rgba(255,255,255,0.15)' : '#111111',
          duration: 0.6,
          ease: 'elastic.out(1, 0.75)',
          overwrite: 'auto',
        });
        gsap.to(details, {
          opacity: 1,
          y: 0,
          duration: 0.28,
          ease: 'power3.out',
          overwrite: 'auto',
        });
      } else {
        gsap.to(details, {
          opacity: 0,
          y: -10,
          duration: 0.12,
          ease: 'power2.in',
          overwrite: 'auto',
          onComplete: () => {
            gsap.set(details, { display: 'none', y: -10 });
          },
        });
        gsap.to(el, {
          height: 60,
          borderRadius: 30,
          backgroundColor: live ? 'rgba(255,255,255,0.1)' : '#000000',
          duration: 0.35,
          ease: 'power3.out',
          overwrite: 'auto',
        });
      }
    },
    { scope: ref, dependencies: [expanded, live] },
  );

  return (
    <div 
      ref={ref}
      onClick={() => setExpanded(!expanded)}
      className={`relative overflow-hidden cursor-pointer shadow-island border border-white/10 ${live ? 'bg-white/10' : 'bg-black'}`}
      style={{ height: 60, borderRadius: 30, animation: `fade-in-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) both`, animationDelay: `${index * 0.05}s` }}
    >
      <div className="absolute top-0 left-0 right-0 z-10 flex h-[60px] items-center justify-between px-5">
        <div className="flex items-center gap-4 min-w-0">
          <span className={`font-mono font-bold text-sm shrink-0 ${live ? 'text-white' : 'text-kiddy-cherry'}`}>{ev.time_start}</span>
          <span className="font-bold text-white text-sm truncate">{ev.title}</span>
        </div>
        {ev.isPermanent && !live && <Users size={14} className="text-zinc-500 shrink-0 ml-2" />}
        {live && <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0 ml-2" />}
      </div>
      <div ref={detailsRef} className="ev-details opacity-0 pt-[60px] px-5 pb-5" style={{ display: 'none' }}>
        {ev.time_end && <p className="text-zinc-400 text-xs font-mono mb-2">До {ev.time_end}</p>}
        {ev.description && <p className="text-zinc-300 text-sm leading-relaxed mb-3">{ev.description}</p>}
        {ev.location && <p className="text-zinc-400 text-xs flex items-center gap-1.5"><MapPin size={12} /> {ev.location}</p>}
      </div>
    </div>
  );
};

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
                  ? 'bg-[#111] border-white/20 shadow-premium'
                  : isPast
                    ? 'bg-black border-white/[0.04] opacity-50'
                    : 'bg-[#0a0a0a] border-white/[0.06] hover:border-white/[0.1]'
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
                        ? 'bg-white text-black shadow-premium'
                        : 'bg-white/[0.04] text-kiddy-textSecondary'
                    }`}
                  >
                    {date.getDate()}
                  </div>
                  <div>
                    <span className={`font-bold text-sm ${isToday ? 'text-white' : 'text-white'}`}>
                      {DAY_NAMES[dow - 1]}
                    </span>
                    {isToday && (
                      <span className="block text-[10px] text-zinc-400 font-bold uppercase tracking-widest">
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
                      return <EventIsland key={ev.id} ev={ev} live={live} index={i} />;
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
