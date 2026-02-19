
import React from 'react';
import { User } from '../types';
import { Card } from '../components/ui/Card';
import { Play, Award, ChevronRight, Calendar, Terminal, Loader2, Star, Zap, User as UserIcon } from 'lucide-react';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar } from 'recharts';
import { SKILL_DATA } from '../constants';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useContent } from '../hooks/useContent';

interface DashboardProps {
  user: User;
}

export const Dashboard: React.FC<DashboardProps> = ({ user }) => {
  const { requireAuth, isGuest } = useAuth();
  const { courses, loading } = useContent();
  const navigate = useNavigate();
  
  const activeCourse = courses[0];
  const nextLesson = activeCourse?.modules.flatMap(m => m.lessons).find(l => !l.isCompleted && !l.locked);

  const handleStartLesson = () => {
    requireAuth(() => { navigate('/courses'); });
  };

  return (
    <div className="space-y-10 animate-slide-up pb-10">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-6">
            <div className="relative group">
                <div className="absolute inset-0 bg-kiddy-primary blur-2xl opacity-20 group-hover:opacity-40 transition-opacity" />
                <img 
                    src={user.avatar || 'https://ui-avatars.com/api/?name=User&background=random'} 
                    className="w-16 h-16 md:w-20 md:h-20 rounded-[1.5rem] border-2 border-kiddy-primary/30 relative z-10 object-cover shadow-2xl bg-zinc-900" 
                    alt="Me" 
                />
            </div>
            <div>
              <h1 className="text-3xl md:text-5xl font-display font-bold text-white tracking-tight">
                Привет, <span className="text-kiddy-primary">{user.name.split(' ')[0]}</span>
              </h1>
            </div>
        </div>
        
        <div className="flex gap-3">
            <div className="bg-zinc-900/40 border border-zinc-800 p-3 rounded-2xl flex items-center gap-4 px-6 group cursor-pointer hover:border-kiddy-primary/30 transition-all" onClick={() => navigate('/profile')}>
                <div className="text-right">
                    <p className="text-[9px] text-zinc-500 uppercase font-bold tracking-widest">Уровень</p>
                    <p className="text-xl font-display font-bold text-white group-hover:text-kiddy-primary transition-colors">{user.level}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-kiddy-primary/10 flex items-center justify-center border border-kiddy-primary/20">
                    <Star className="text-kiddy-primary" size={20} fill="currentColor" />
                </div>
            </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Course Banner */}
        <div className="lg:col-span-2">
            {loading ? (
                 <Card className="h-full flex items-center justify-center min-h-[350px] bg-zinc-950/50">
                    <Loader2 className="animate-spin text-zinc-800" />
                 </Card>
            ) : activeCourse ? (
                <Card glow className="h-full flex flex-col justify-between group cursor-pointer relative min-h-[350px] bg-black border-zinc-800/50 overflow-hidden shadow-2xl" onClick={handleStartLesson}>
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent z-10" />
                    <img src={activeCourse.coverImage} className="absolute inset-0 w-full h-full object-cover opacity-30 group-hover:scale-105 transition-transform duration-1000" alt="Cover" />
                    
                    <div className="relative z-20 p-8 space-y-4">
                        <div className="flex items-center gap-2">
                            <span className="px-3 py-1 bg-kiddy-primary text-white rounded-full text-[9px] font-bold uppercase tracking-widest shadow-lg">
                                {isGuest ? 'Пробный урок' : 'В процессе'}
                            </span>
                            <span className="text-white/60 text-[9px] font-bold uppercase tracking-widest">{activeCourse.title}</span>
                        </div>
                        <h3 className="text-4xl md:text-5xl font-display font-bold text-white leading-tight max-w-lg italic">
                            {nextLesson?.title || 'Продолжай учиться'}
                        </h3>
                    </div>

                    <div className="relative z-20 p-8 pt-0">
                        <button className="bg-white text-black px-12 py-5 rounded-[1.5rem] font-bold flex items-center gap-3 hover:bg-kiddy-primary hover:text-white transition-all transform group-active:scale-95 shadow-2xl">
                            <Play size={18} fill="currentColor" />
                            Продолжить путь
                        </button>
                    </div>
                </Card>
            ) : (
                <Card className="h-full flex flex-col items-center justify-center p-20 text-center border-dashed border-zinc-800 bg-zinc-950/20">
                     <Zap className="text-zinc-800 mb-4" size={48} />
                     <p className="text-zinc-500 font-bold uppercase text-xs tracking-widest">Курсы пока не добавлены</p>
                </Card>
            )}
        </div>

        {/* Stats & Skills */}
        <div className="space-y-6">
            <Card className="bg-zinc-950/50 border-zinc-800 shadow-xl p-8 rounded-[2.5rem]">
                <div className="flex items-center justify-between mb-8">
                    <h3 className="font-bold text-white text-[10px] uppercase tracking-widest flex items-center gap-2">
                        <Zap size={14} className="text-kiddy-primary shadow-glow" />
                        Анализ Навыков
                    </h3>
                </div>
                <div className="h-60 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={SKILL_DATA}>
                            <PolarGrid stroke="#27272a" />
                            <PolarAngleAxis dataKey="subject" tick={{ fill: '#71717a', fontSize: 10, fontWeight: 700 }} />
                            <Radar name="User" dataKey="A" stroke="#be123c" fill="#be123c" fillOpacity={0.5} />
                        </RadarChart>
                    </ResponsiveContainer>
                </div>
            </Card>
        </div>
      </div>

      <section className="animate-slide-up" style={{ animationDelay: '0.2s' }}>
        <h3 className="text-[10px] font-bold text-zinc-600 uppercase tracking-[0.4em] mb-8 px-1">Расписание занятий</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card hoverEffect className="p-8 flex items-center justify-between bg-zinc-950/40 border-zinc-800/60 rounded-[2rem]">
                <div className="flex items-center gap-6">
                    <div className="bg-zinc-900 p-5 rounded-2xl border border-zinc-800 shadow-inner group-hover:border-kiddy-primary/30 transition-all">
                        <Calendar className="text-zinc-500" size={24} />
                    </div>
                    <div>
                        <p className="text-white font-bold text-lg">Мастер-класс: Архитектура ИИ</p>
                        <p className="text-[10px] text-kiddy-primary font-bold uppercase tracking-widest mt-2 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-kiddy-primary animate-pulse" />
                            Завтра в 17:00
                        </p>
                    </div>
                </div>
                <ChevronRight className="text-zinc-800 group-hover:text-white transition-all" size={24} />
            </Card>
            
            <Card hoverEffect className="p-8 flex items-center justify-between bg-zinc-950/40 border-zinc-800/60 rounded-[2rem]">
                <div className="flex items-center gap-6">
                    <div className="bg-zinc-900 p-5 rounded-2xl border border-zinc-800 shadow-inner group-hover:border-kiddy-primary/30 transition-all">
                        <Terminal className="text-zinc-500" size={24} />
                    </div>
                    <div>
                        <p className="text-white font-bold text-lg">Хакатон: Весенний взлом</p>
                        <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest mt-2">Через 3 дня</p>
                    </div>
                </div>
                <ChevronRight className="text-zinc-800 group-hover:text-white transition-all" size={24} />
            </Card>
        </div>
      </section>
    </div>
  );
};
