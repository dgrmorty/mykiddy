import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { Card } from '../components/ui/Card';
import { Calendar } from 'lucide-react';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar } from 'recharts';
import { SKILL_DATA } from '../constants';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useContent } from '../hooks/useContent';
import { AnimatedEmptyState } from '../components/ui/AnimatedEmptyState';
import { AnimatedIcon } from '../components/ui/AnimatedIcon';
import { AnimatedGrid } from '../components/ui/AnimatedGrid';
import { RotatingLaptop } from '../components/ui/RotatingLaptop';
import { supabase } from '../services/supabase';
import { ScheduleEvent } from '../types';

interface DashboardProps {
  user: User;
}

const DAY_NAMES: Record<number, string> = { 1: 'Пн', 2: 'Вт', 3: 'Ср', 4: 'Чт', 5: 'Пт', 6: 'Сб', 7: 'Вс' };

export const Dashboard: React.FC<DashboardProps> = ({ user }) => {
  const { requireAuth, isGuest } = useAuth();
  const { courses, loading, loadError, retryLoad } = useContent(user?.id !== 'guest' ? user?.id : undefined);
  const [scheduleEvents, setScheduleEvents] = useState<ScheduleEvent[]>([]);
  const navigate = useNavigate();
  const activeCourse = courses[0];
  const nextLesson = activeCourse?.modules?.flatMap(m => m.lessons).find(l => !l.isCompleted && !l.locked);

  useEffect(() => {
    void supabase.from('schedule_events').select('*').order('day_of_week').order('sort_order').order('time_start')
      .then(({ data }) => setScheduleEvents(data || []))
      .then(() => {}, () => setScheduleEvents([]));
  }, []);

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
      <div className="stagger-1 flex flex-col md:flex-row md:items-center md:justify-between gap-6 md:gap-8">
        <div className="min-w-0">
          <h1 className="text-4xl md:text-6xl font-display font-extrabold text-white tracking-tighter">
            Добро пожаловать, {user.name.split(' ')[0]}
          </h1>
        </div>
        <div className="w-full md:w-[320px] md:min-w-[280px] h-[200px] md:h-[240px] flex-shrink-0 rounded-2xl overflow-hidden bg-white/[0.03] border border-white/[0.06]">
          <RotatingLaptop height="100%" />
        </div>
      </div>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        <div className="lg:col-span-2 stagger-2">
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

        <div className="stagger-3">
          <Card className="h-full flex flex-col">
            <h3 className="font-display font-bold text-xl text-white tracking-tight mb-1">Навыки</h3>
            <p className="text-kiddy-textMuted text-xs mb-6">Пример по курсам</p>
            <div className="flex-1 min-h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="65%" data={SKILL_DATA}>
                  <PolarGrid stroke="rgba(255,255,255,0.08)" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#a1a1aa', fontSize: 11, fontWeight: 600 }} />
                  <Radar name="User" dataKey="A" stroke="#e6002b" fill="#e6002b" fillOpacity={0.15} strokeWidth={2} />
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
          <h3 className="font-display font-bold text-2xl text-white tracking-tight">События</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {scheduleEvents.length === 0 ? (
            <Card className="p-8 text-center">
              <Calendar className="text-kiddy-textMuted mx-auto mb-3" size={32} />
              <p className="text-kiddy-textMuted font-medium">Скоро появятся события</p>
            </Card>
          ) : (
            scheduleEvents.slice(0, 4).map((ev) => (
              <Card key={ev.id} hoverEffect className="flex items-center justify-between gap-6 group">
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/[0.04] flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300">
                    <Calendar className="text-white" size={28} strokeWidth={1.5} />
                  </div>
                  <div>
                    <p className="font-bold text-xl text-white mb-1">{ev.title}</p>
                    <p className="text-sm font-semibold text-kiddy-cherry">
                      {DAY_NAMES[ev.day_of_week] ?? ''} {ev.time_start}
                      {ev.time_end ? ` – ${ev.time_end}` : ''}
                    </p>
                    {ev.location && <p className="text-kiddy-textMuted text-xs mt-1">{ev.location}</p>}
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </section>
    </div>
  );
};
