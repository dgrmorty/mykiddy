import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { supabase } from '../services/supabase';
import { AnimatedEmptyState } from '../components/ui/AnimatedEmptyState';
import { Calendar, MapPin, Clock } from 'lucide-react';
import type { ScheduleEvent } from '../types';

const DAY_NAMES = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];
const DAY_SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

/** Текущий день недели: 1 = Пн, 7 = Вс */
const getCurrentDayNum = () => {
  const d = new Date().getDay(); // 0=Вс, 1=Пн, ... 6=Сб
  return d === 0 ? 7 : d;
};

export const Schedule: React.FC = () => {
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const currentDay = getCurrentDayNum();

  useEffect(() => {
    const load = async () => {
      try {
        const { data, error } = await supabase
          .from('schedule_events')
          .select('*')
          .order('day_of_week')
          .order('sort_order')
          .order('time_start');
        if (!error) setEvents(data || []);
      } catch (_) {}
      setLoading(false);
    };
    load();
  }, []);

  const eventsByDay: Record<number, ScheduleEvent[]> = {};
  for (let i = 1; i <= 7; i++) eventsByDay[i] = [];
  events.forEach((e) => {
    if (e.day_of_week >= 1 && e.day_of_week <= 7) eventsByDay[e.day_of_week].push(e);
  });

  if (loading) {
    return (
      <div className="animate-fade-in flex flex-col items-center justify-center min-h-[60vh]">
        <AnimatedEmptyState message="Загружаем расписание" />
      </div>
    );
  }

  return (
    <div className="animate-slide-up max-w-3xl mx-auto pb-20">
      {/* Текущий день — крупно, в стиле Apple Notes */}
      <div className="mb-10">
        <p className="text-kiddy-textMuted text-[10px] font-bold uppercase tracking-[0.3em] mb-1">Сегодня</p>
        <h1 className="text-3xl md:text-4xl font-display font-bold text-white tracking-tight">
          {DAY_NAMES[currentDay - 1]}
        </h1>
      </div>

      {/* События на сегодня — блок-заметки */}
      <section className="space-y-4">
        <h2 className="text-kiddy-textMuted text-xs font-bold uppercase tracking-widest flex items-center gap-2">
          <Calendar size={14} /> События на сегодня
        </h2>
        {eventsByDay[currentDay].length === 0 ? (
          <Card className="bg-kiddy-surfaceElevated/90 border border-white/[0.08] rounded-2xl p-8 text-center min-h-[300px] flex items-center justify-center">
            <AnimatedEmptyState message="На сегодня событий нет" />
          </Card>
        ) : (
          <div className="space-y-3">
            {eventsByDay[currentDay].map((ev, i) => (
              <Card
                key={ev.id}
                className="bg-kiddy-surfaceElevated/90 border border-white/[0.08] rounded-2xl p-5 hover:border-white/10 transition-all duration-300"
                noPadding
                hoverEffect
                style={{ animation: `fade-in-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) both`, animationDelay: `${i * 0.08}s` }}
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-14 text-right">
                    <span className="text-kiddy-cherry font-mono font-bold text-sm">{ev.time_start}</span>
                    {ev.time_end && <span className="text-kiddy-textMuted font-mono text-xs block">{ev.time_end}</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-bold text-lg leading-tight">{ev.title}</h3>
                    {ev.description && <p className="text-kiddy-textSecondary text-sm mt-1.5 leading-relaxed whitespace-pre-wrap">{ev.description}</p>}
                    {ev.location && (
                      <p className="text-kiddy-textMuted text-xs mt-2 flex items-center gap-1.5">
                        <MapPin size={12} /> {ev.location}
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Вся неделя — компактно */}
      <section className="mt-12">
        <h2 className="text-kiddy-textMuted text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
          <Clock size={14} /> Неделя
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1, 2, 3, 4, 5, 6, 7].map((dayNum, i) => (
            <div
              key={dayNum}
              className={`rounded-2xl border p-4 transition-all duration-300 hover:scale-[1.02] ${
                dayNum === currentDay
                  ? 'bg-kiddy-cherry/10 border-kiddy-cherry/30 hover-glow'
                  : 'bg-kiddy-surfaceElevated/80 border-white/[0.08] hover:border-white/[0.12]'
              }`}
              style={{ animation: `reveal-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) both`, animationDelay: `${i * 0.06}s` }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`font-bold text-sm ${dayNum === currentDay ? 'text-kiddy-cherry' : 'text-kiddy-textSecondary'}`}>
                  {DAY_SHORT[dayNum - 1]}
                </span>
                {dayNum === currentDay && <span className="text-[10px] text-kiddy-cherry font-bold uppercase">Сегодня</span>}
              </div>
              <div className="space-y-1.5">
                {eventsByDay[dayNum].length === 0 ? (
                  <p className="text-zinc-600 text-xs">—</p>
                ) : (
                  eventsByDay[dayNum].slice(0, 3).map((ev) => (
                    <p key={ev.id} className="text-zinc-300 text-xs truncate">
                      {ev.time_start} {ev.title}
                    </p>
                  ))
                )}
                {eventsByDay[dayNum].length > 3 && <p className="text-kiddy-textMuted text-xs">+{eventsByDay[dayNum].length - 3}</p>}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
