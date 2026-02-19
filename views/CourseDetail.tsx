
import React, { useState, useEffect, useRef } from 'react';
import { Card } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import { 
    X, ArrowLeft, PenTool, Sparkles, Send, Loader2, 
    Maximize2, Minimize2, MonitorPlay, Zap, FileText, CheckCircle, Lock
} from 'lucide-react';
import { Course, Lesson } from '../types';
import { checkHomework } from '../services/geminiService';
import { contentService } from '../services/contentService';
import { useAuth } from '../contexts/AuthContext';
import { AccessGate } from '../components/AccessGate';
import { sanitizeInput, isPotentialInjection } from '../utils/security';
import { useContentContext } from '../contexts/ContentContext';

export const CourseDetail: React.FC = () => {
  const { user } = useAuth();
  const { activeCourse, setActiveCourse, activeLesson, setActiveLesson } = useContentContext();
  
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [isTheaterMode, setIsTheaterMode] = useState(false);
  const [isHomeworkOpen, setIsHomeworkOpen] = useState(false);
  const [homeworkAnswer, setHomeworkAnswer] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [aiFeedback, setAiFeedback] = useState<string | null>(null);
  const [securityError, setSecurityError] = useState<string | null>(null);
  const [lessonCompleting, setLessonCompleting] = useState(false);

  const playerRef = useRef<HTMLDivElement>(null);

  const loadData = async () => {
      setLoading(true);
      try {
          const data = await contentService.getCourses(user.id);
          setCourses(data || []);
          
          // Синхронизируем состояние если есть активный курс
          if (activeCourse) {
              const updatedCourse = (data || []).find(c => c.id === activeCourse.id);
              if (updatedCourse) {
                  setActiveCourse(updatedCourse);
                  if (activeLesson) {
                      const updatedLesson = updatedCourse.modules.flatMap(m => m.lessons).find(l => l.id === activeLesson.id);
                      if (updatedLesson) setActiveLesson(updatedLesson);
                  }
              }
          }
      } catch (err) {
          console.error("[CourseDetail] Load Error:", err);
      } finally {
          setLoading(false);
      }
  };

  useEffect(() => {
    loadData();
  }, [user.id]);

  useEffect(() => {
    if (activeLesson && playerRef.current) {
        playerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [activeLesson]);

  const handleCompleteLesson = async () => {
      if (!activeLesson || activeLesson.isCompleted) return;
      setLessonCompleting(true);
      try {
          const success = await contentService.markLessonComplete(user.id, activeLesson.id);
          if (success) await loadData();
      } finally {
          setLessonCompleting(false);
      }
  };

  const handleCheckHomework = async () => {
    if (!activeLesson?.homeworkTask || !homeworkAnswer.trim()) return;
    setSecurityError(null);
    setAiFeedback(null);
    const cleanAnswer = sanitizeInput(homeworkAnswer);
    const injectionError = isPotentialInjection(cleanAnswer);
    if (injectionError) { setSecurityError(injectionError); return; }
    setIsChecking(true);
    try {
        const feedback = await checkHomework(activeLesson.homeworkTask, cleanAnswer);
        setAiFeedback(feedback);
        if (feedback.includes('ACCEPTED') || feedback.length > 20) {
            await contentService.markLessonComplete(user.id, activeLesson.id);
            await loadData();
        }
    } catch (e) {
        setAiFeedback("Ошибка связи с ИИ.");
    } finally {
        setIsChecking(false);
    }
  };

  const getVideoComponent = (url?: string) => {
    if (!url) return <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950"><MonitorPlay size={48} className="text-zinc-800 mb-4" /><p className="text-zinc-600 font-bold uppercase tracking-widest text-[10px]">Видео недоступно</p></div>;
    const isYoutube = url.includes('youtube.com') || url.includes('youtu.be');
    if (isYoutube) {
        let id = '';
        try {
            if (url.includes('v=')) id = url.split('v=')[1].split('&')[0];
            else if (url.includes('youtu.be/')) id = url.split('youtu.be/')[1].split('?')[0];
            else id = url.split('/').pop() || '';
        } catch (e) {}
        return <iframe src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=0&rel=0`} title="Lesson Video" className="w-full h-full absolute inset-0 border-0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />;
    }
    return <video controls className="w-full h-full absolute inset-0 bg-black"><source src={url} type="video/mp4" /></video>;
  };

  if (loading && courses.length === 0) return (
    <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
        <Loader2 className="animate-spin text-kiddy-primary" size={40} />
        <p className="text-zinc-500 font-mono text-[10px] uppercase tracking-widest">Загружаем знания...</p>
    </div>
  );

  if (activeLesson && activeCourse) {
    return (
        <div className="flex flex-col h-full animate-slide-up relative" ref={playerRef}>
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-6">
                    <button onClick={() => setActiveLesson(null)} className="p-3 bg-zinc-900 border border-zinc-800 rounded-2xl text-zinc-400 hover:text-white transition-all"><ArrowLeft size={20} /></button>
                    <div><h4 className="text-zinc-500 text-[10px] font-bold uppercase tracking-[0.2em] mb-1">{activeCourse.title}</h4><h2 className="text-2xl font-display font-bold text-white tracking-tight">{activeLesson.title}</h2></div>
                </div>
                <div className="flex gap-2">
                    {!activeLesson.isCompleted ? <button onClick={handleCompleteLesson} disabled={lessonCompleting} className="px-6 py-3 bg-white text-black font-bold rounded-2xl hover:bg-kiddy-primary hover:text-white transition-all flex items-center gap-2">{lessonCompleting ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle size={18} />}<span className="hidden md:inline">Завершить урок</span></button> : <div className="px-6 py-3 bg-green-500/10 text-green-500 border border-green-500/20 font-bold rounded-2xl flex items-center gap-2"><CheckCircle size={18} /><span className="hidden md:inline">Пройдено</span></div>}
                    <button onClick={() => setIsTheaterMode(!isTheaterMode)} className="p-3 bg-zinc-900 border border-zinc-800 rounded-2xl text-zinc-400 hover:text-white transition-all hidden md:block">{isTheaterMode ? <Minimize2 size={20} /> : <Maximize2 size={20} />}</button>
                </div>
            </div>
            {!user.isApproved ? <AccessGate /> : (
                <div className={`grid grid-cols-1 ${isTheaterMode ? 'gap-12' : 'lg:grid-cols-3 gap-10'}`}>
                    <div className={`${isTheaterMode ? 'lg:col-span-3' : 'lg:col-span-2'} space-y-8`}><Card className="relative aspect-video bg-black border-zinc-800 shadow-2xl overflow-hidden rounded-[2rem]" noPadding>{getVideoComponent(activeLesson.videoUrl)}</Card></div>
                    {!isTheaterMode && (
                        <div className="space-y-6">
                            <Card className="bg-kiddy-primary/5 border-kiddy-primary/20 p-8 flex flex-col justify-between h-fit">
                                <div>
                                    <div className="w-12 h-12 bg-kiddy-primary/10 rounded-2xl flex items-center justify-center mb-6 border border-kiddy-primary/20">
                                        <Zap className="text-kiddy-primary" size={24} />
                                    </div>
                                    <h3 className="text-white font-bold text-lg mb-3">Практика</h3>
                                    {activeLesson.homeworkTask ? (
                                        <div className="mb-6">
                                            <p className="text-zinc-400 text-xs font-bold uppercase tracking-widest mb-3">Задание:</p>
                                            <div className="bg-black/50 border border-zinc-800 rounded-xl p-4 mb-4">
                                                <p className="text-white text-sm leading-relaxed whitespace-pre-wrap">{activeLesson.homeworkTask}</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="text-zinc-500 text-sm leading-relaxed mb-10">Задание не задано для этого урока.</p>
                                    )}
                                </div>
                                {activeLesson.homeworkTask && (
                                    <button 
                                        onClick={() => setIsHomeworkOpen(true)} 
                                        className="w-full py-4 bg-kiddy-primary text-white font-bold rounded-2xl hover:bg-rose-700 transition-all flex items-center justify-center gap-2"
                                    >
                                        <PenTool size={18} /> Сдать работу
                                    </button>
                                )}
                            </Card>
                        </div>
                    )}
                </div>
            )}
            <Modal isOpen={isHomeworkOpen} onClose={() => setIsHomeworkOpen(false)} maxWidth="max-w-xl">
                <div className="p-10 flex flex-col h-full">
                    <h2 className="text-2xl font-display font-bold text-white mb-6">Ваше решение</h2>
                    {activeLesson?.homeworkTask && (
                        <div className="mb-6 p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl">
                            <p className="text-zinc-400 text-xs font-bold uppercase tracking-widest mb-2">Задание:</p>
                            <p className="text-white text-sm leading-relaxed whitespace-pre-wrap">{activeLesson.homeworkTask}</p>
                        </div>
                    )}
                    <textarea 
                        value={homeworkAnswer} 
                        onChange={(e) => setHomeworkAnswer(e.target.value)} 
                        className="flex-1 bg-black border border-zinc-800 p-6 rounded-2xl text-white outline-none focus:border-kiddy-primary transition-all font-mono text-sm" 
                        placeholder="Вставьте ваш код или текст..." 
                    />
                    {aiFeedback && (
                        <div className="mt-6 p-6 bg-zinc-900 border border-zinc-800 rounded-2xl text-sm text-zinc-300 leading-relaxed italic">
                            {aiFeedback}
                        </div>
                    )}
                    {securityError && (
                        <div className="mt-4 text-red-500 text-xs font-bold">{securityError}</div>
                    )}
                    <div className="mt-8 flex gap-4">
                        <button onClick={() => setIsHomeworkOpen(false)} className="px-8 py-4 bg-zinc-900 text-white font-bold rounded-xl">
                            Закрыть
                        </button>
                        <button 
                            onClick={handleCheckHomework} 
                            disabled={isChecking || !activeLesson?.homeworkTask} 
                            className="flex-1 py-4 bg-kiddy-primary text-white font-bold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isChecking ? <Loader2 className="animate-spin" size={20} /> : <><Send size={18} /> Проверить</>}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
  }

  return (
    <div className="animate-slide-up space-y-12">
      <header><h1 className="text-4xl md:text-5xl font-display font-bold text-white tracking-tighter">Библиотека <span className="text-kiddy-primary">Курсов</span></h1><p className="text-zinc-500 mt-2 font-medium">Ваш путь к мастерству в IT.</p></header>
      {courses.length === 0 ? (
          <div className="py-20 text-center space-y-4 opacity-50"><div className="bg-zinc-900 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border border-zinc-800"><FileText className="text-zinc-500" /></div><p className="text-zinc-500 font-bold uppercase text-[10px] tracking-widest">Курсы загружаются или временно недоступны</p><button onClick={loadData} className="px-6 py-2 bg-zinc-800 rounded-lg text-xs font-bold text-white hover:bg-zinc-700">Переподключиться</button></div>
      ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {courses.map((course) => (
              <Card key={course.id} noPadding className="group cursor-pointer bg-black border-zinc-900/50 hover:border-kiddy-primary/30 transition-all overflow-hidden rounded-[2.5rem] flex flex-col h-full" onClick={() => setActiveCourse(course)}>
                <div className="aspect-[16/10] relative overflow-hidden"><img src={course.coverImage || 'https://picsum.photos/400/250'} className="absolute inset-0 w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700 group-hover:scale-105" alt="" /><div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60" /></div>
                <div className="p-8 space-y-4 flex-1 flex flex-col justify-between">
                    <div><h3 className="text-white font-bold text-xl group-hover:text-kiddy-primary transition-colors">{course.title}</h3><p className="text-zinc-500 text-xs line-clamp-2 mt-2 leading-relaxed">{course.description}</p></div>
                    <div className="space-y-4 pt-4"><div className="flex justify-between items-end"><span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Прогресс</span><span className="text-xs font-bold text-white">{course.progress}%</span></div><div className="h-1 w-full bg-zinc-900 rounded-full overflow-hidden"><div className="h-full bg-kiddy-primary transition-all duration-1000" style={{ width: `${course.progress}%` }} /></div></div>
                </div>
              </Card>
            ))}
          </div>
      )}
      {activeCourse && !activeLesson && (
        <Modal isOpen={!!activeCourse} onClose={() => setActiveCourse(null)} maxWidth="max-w-4xl">
            <div className="flex flex-col h-full bg-zinc-950"><div className="relative h-64 md:h-80 shrink-0"><img src={activeCourse.coverImage} className="w-full h-full object-cover opacity-40" alt="" /><div className="absolute inset-0 bg-gradient-to-t from-zinc-950 to-transparent" /><button onClick={() => setActiveCourse(null)} className="absolute top-8 right-8 p-3 bg-black/50 backdrop-blur-md rounded-2xl text-white"><X size={20} /></button><div className="absolute bottom-10 left-10"><h2 className="text-4xl md:text-5xl font-display font-bold text-white italic">{activeCourse.title}</h2><p className="text-zinc-400 mt-2 max-w-lg">{activeCourse.description}</p></div></div><div className="flex-1 overflow-y-auto p-10 no-scrollbar space-y-12">{activeCourse.modules.map((module) => (<div key={module.id} className="space-y-6"><div className="flex items-center gap-4"><div className="h-px flex-1 bg-zinc-900" /><h3 className="text-zinc-500 font-bold uppercase text-[10px] tracking-[0.4em] px-4 whitespace-nowrap">{module.title}</h3><div className="h-px flex-1 bg-zinc-900" /></div><div className="grid grid-cols-1 md:grid-cols-2 gap-4">{module.lessons.map((lesson, idx) => (<div key={lesson.id} onClick={() => !lesson.locked && setActiveLesson(lesson)} className={`p-6 rounded-[2rem] border transition-all flex items-center justify-between group ${lesson.locked ? 'bg-zinc-950/20 border-zinc-900/50 opacity-40 cursor-not-allowed' : 'bg-black border-zinc-900 cursor-pointer hover:border-kiddy-primary/50 hover:bg-zinc-900/30'}`}><div className="flex items-center gap-5"><div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-display font-bold text-sm ${lesson.isCompleted ? 'bg-green-500/10 text-green-500' : 'bg-zinc-900 text-zinc-500 group-hover:bg-kiddy-primary group-hover:text-white'}`}>{lesson.isCompleted ? <CheckCircle size={18} /> : (idx + 1)}</div><div><h4 className="text-white font-bold text-sm">{lesson.title}</h4><p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1">15 минут</p></div></div>{lesson.locked && <Lock size={16} className="text-zinc-800" />}</div>))}</div></div>))}</div></div>
        </Modal>
      )}
    </div>
  );
};
