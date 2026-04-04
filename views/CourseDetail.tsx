
import React, { useState, useEffect, useRef } from 'react';
import { Card } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import { 
    X, ArrowLeft, PenTool, Sparkles, Send, Loader2, 
    Maximize2, Minimize2, MonitorPlay, Zap, CheckCircle, Lock
} from 'lucide-react';
import { Course, Lesson } from '../types';
import { checkHomework } from '../services/geminiService';
import { contentService, invalidateCoursesCache, CoursesLoadError } from '../services/contentService';
import { useAuth } from '../contexts/AuthContext';

import { sanitizeInput, isPotentialInjection } from '../utils/security';
import { useContentContext } from '../contexts/ContentContext';
import { supabase } from '../services/supabase';
import { useToast } from '../contexts/ToastContext';

import { AnimatedEmptyState } from '../components/ui/AnimatedEmptyState';
import { AnimatedLearningScene } from '../components/ui/AnimatedLearningScene';

export const CourseDetail: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const { activeCourse, setActiveCourse, activeLesson, setActiveLesson } = useContentContext();
  const { showToast } = useToast();
  
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [videoLoading, setVideoLoading] = useState(true);
  const [isTheaterMode, setIsTheaterMode] = useState(false);
  const [isHomeworkOpen, setIsHomeworkOpen] = useState(false);
  const [homeworkAnswer, setHomeworkAnswer] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [aiFeedback, setAiFeedback] = useState<string | null>(null);
  const [securityError, setSecurityError] = useState<string | null>(null);
  const [lessonCompleting, setLessonCompleting] = useState(false);
  const [isHomeworkCompleted, setIsHomeworkCompleted] = useState(false);
  const [lastAnswerWasGood, setLastAnswerWasGood] = useState(false);
  const [closingCourse, setClosingCourse] = useState<Course | null>(null);
  
  // Анимация перехода в урок
  const [isTransitioning, setIsTransitioning] = useState(false);

  const playerRef = useRef<HTMLDivElement>(null);
  const courseForModal = activeCourse || closingCourse;

  const handleOpenLesson = (lesson: Lesson) => {
    if (lesson.locked) return;
    setIsTransitioning(true);
    setTimeout(() => {
        setActiveLesson(lesson);
        setIsTransitioning(false);
    }, 1200);
  };

  const loadData = async (silent = false, forceRefresh = false) => {
      if (forceRefresh) invalidateCoursesCache();
      if (!silent) { setLoading(true); setLoadError(null); }
      try {
          const data = await contentService.getCourses(user.id);
          setCourses(data || []);
          setLoadError(null);
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
          if (err instanceof CoursesLoadError) setLoadError('Не удалось загрузить. Повторите позже.');
          else setLoadError('Не удалось загрузить. Повторите позже.');
          setCourses([]);
      } finally {
          if (!silent) setLoading(false);
      }
  };

  useEffect(() => {
    loadData();
  }, [user.id]);

  // При возврате на вкладку тихо подтягиваем курсы не чаще раза в 90 сек (кэш в contentService)
  const lastVisibilityLoadRef = useRef(0);
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState !== 'visible' || !user.id) return;
      if (Date.now() - lastVisibilityLoadRef.current < 90000) return;
      lastVisibilityLoadRef.current = Date.now();
      loadData(true);
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [user.id]);

  // При входе в урок или смене урока — модалку ДЗ не показываем (убираем «выскакивание»)
  useEffect(() => {
    setIsHomeworkOpen(false);
  }, [activeLesson?.id]);

  useEffect(() => {
    if (activeLesson) setVideoLoading(true);
  }, [activeLesson?.id]);

  useEffect(() => {
    if (activeLesson && playerRef.current) {
        playerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    
    // Проверяем статус ДЗ при смене урока
    if (activeLesson?.id && user.id) {
        void supabase
            .from('homework_submissions')
            .select('id')
            .eq('user_id', user.id)
            .eq('lesson_id', activeLesson.id)
            .single()
            .then(({ data }) => setIsHomeworkCompleted(!!data))
            .then(() => {}, () => setIsHomeworkCompleted(false));
    } else {
        setIsHomeworkCompleted(false);
    }
  }, [activeLesson, user.id]);

  const handleCompleteLesson = async () => {
      if (!activeLesson || activeLesson.isCompleted) return;
      setLessonCompleting(true);
      try {
          const success = await contentService.markLessonComplete(user.id, activeLesson.id);
          if (success) await loadData(false, true);
      } finally {
          setLessonCompleting(false);
      }
  };

  const handleCheckHomework = async () => {
    if (!activeLesson?.homeworkTask || !homeworkAnswer.trim()) return;
    
    // Проверяем, не решено ли уже это ДЗ
    if (isHomeworkCompleted) {
        showToast('Это задание уже решено!', 'info');
        return;
    }
    
    setSecurityError(null);
    setAiFeedback(null);
    setLastAnswerWasGood(false);
    const cleanAnswer = sanitizeInput(homeworkAnswer);
    const injectionError = isPotentialInjection(cleanAnswer);
    if (injectionError) { setSecurityError(injectionError); return; }
    setIsChecking(true);
    try {
        const { data: { session } } = await supabase.auth.getSession();
        const feedback = await checkHomework(activeLesson.homeworkTask, cleanAnswer, session?.access_token ?? null);
        setAiFeedback(feedback);
        
        // Оцениваем ответ; пока XP начисляются сразу, но логика вынесена в отдельную функцию,
        // чтобы при необходимости можно было привязать начисление к закрытию окна с ответом наставника
        const feedbackLower = feedback.toLowerCase();
        const isGoodAnswer = cleanAnswer.trim().length > 10 && 
                            !feedbackLower.includes('совсем не') && 
                            !feedbackLower.includes('пустой') &&
                            !feedbackLower.includes('не по теме');
        
        setLastAnswerWasGood(isGoodAnswer);

        if (isGoodAnswer) {
            await finalizeHomeworkReward(true);
        } else {
            showToast('Проверьте комментарии наставника', 'info');
        }
    } catch (e: any) {
        setAiFeedback(e?.message || "Не удалось проверить задание. Попробуйте еще раз.");
    } finally {
        setIsChecking(false);
    }
  };

  const finalizeHomeworkReward = async (good?: boolean) => {
      if (!activeLesson || isHomeworkCompleted || !(good ?? lastAnswerWasGood)) return;
      try {
          // Отмечаем урок как пройденный (50 XP)
          await contentService.markLessonComplete(user.id, activeLesson.id);
          // Дополнительные очки за выполненное ДЗ (50 XP)
          try {
              await supabase.rpc('increment_xp', { x_val: 50 });
              
              // Сохраняем факт решения ДЗ
              await supabase
                  .from('homework_submissions')
                  .insert({
                      user_id: user.id,
                      lesson_id: activeLesson.id,
                      xp_awarded: 50
                  });
              
              setIsHomeworkCompleted(true);
              showToast('Отлично! Задание принято. +50 XP', 'success');
              
              // Обновляем данные пользователя, чтобы сразу увидеть новый уровень и XP
              await refreshUser();
          } catch (e) {
              console.warn('Failed to increment XP for homework:', e);
          }
          await loadData(false, true);
      } catch (e) {
          console.warn('Failed to finalize homework reward:', e);
      }
  };

  const getVideoComponent = (url?: string) => {
    if (!url) return <div className="absolute inset-0 flex flex-col items-center justify-center bg-kiddy-surfaceElevated"><MonitorPlay size={48} className="text-zinc-800 mb-4" /><p className="text-kiddy-textMuted font-bold uppercase tracking-widest text-[10px]">Видео недоступно</p></div>;
    const isYoutube = url.includes('youtube.com') || url.includes('youtu.be');
    if (isYoutube) {
        let id = '';
        try {
            if (url.includes('v=')) id = url.split('v=')[1].split('&')[0];
            else if (url.includes('youtu.be/')) id = url.split('youtu.be/')[1].split('?')[0];
            else id = url.split('/').pop() || '';
        } catch (e) {}
        return (
          <>
            {videoLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-kiddy-surfaceElevated z-10">
                <div className="w-10 h-10 border-2 border-white/20 border-t-kiddy-cherry rounded-full animate-spin" />
              </div>
            )}
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=0&rel=0`}
              title="Lesson Video"
              className="w-full h-full absolute inset-0 border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              loading="lazy"
              onLoad={() => setVideoLoading(false)}
            />
          </>
        );
    }
    return (
      <>
        {videoLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black z-10">
            <div className="w-10 h-10 border-2 border-white/20 border-t-kiddy-cherry rounded-full animate-spin" />
          </div>
        )}
        <video
          controls
          className="w-full h-full absolute inset-0 bg-black"
          preload="metadata"
          onCanPlay={() => setVideoLoading(false)}
          onLoadedData={() => setVideoLoading(false)}
        >
          <source src={url} type="video/mp4" />
        </video>
      </>
    );
  };

  if (loading && courses.length === 0) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <AnimatedEmptyState message="Загружаем знания..." />
    </div>
  );

  if (loadError && courses.length === 0) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
      <p className="text-kiddy-textSecondary font-medium">{loadError}</p>
      <button onClick={() => loadData(false, true)} className="btn-cta px-6 py-3 rounded-full text-sm font-bold">
        Повторить
      </button>
    </div>
  );

  const activeModule = activeCourse?.modules?.find((m) => m.lessons.some((l) => l.id === activeLesson?.id));

  if (activeLesson && activeCourse) {
    return (
        <div className="flex flex-col h-full animate-slide-up relative" ref={playerRef}>
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-6">
                    <button onClick={() => setActiveLesson(null)} className="p-3 bg-kiddy-surfaceHighlight border border-white/[0.08] rounded-2xl text-kiddy-textSecondary hover:text-white transition-all"><ArrowLeft size={20} /></button>
                    <div>
                      <nav className="text-kiddy-textMuted text-xs font-medium mb-1 flex items-center gap-1.5 flex-wrap">
                        <span>{activeCourse.title}</span>
                        {activeModule && <><span aria-hidden>/</span><span>{activeModule.title}</span></>}
                        {activeLesson && <><span aria-hidden>/</span><span className="text-white">{activeLesson.title}</span></>}
                      </nav>
                      <h2 className="text-2xl font-display font-bold text-white tracking-tight">{activeLesson.title}</h2>
                    </div>
                </div>
                <div className="flex gap-2">
                    {!activeLesson.isCompleted ? <button onClick={handleCompleteLesson} disabled={lessonCompleting} className="px-6 py-3 bg-white text-black font-bold rounded-2xl hover:bg-kiddy-cherry hover:text-white transition-all flex items-center gap-2">{lessonCompleting ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle size={18} />}<span className="hidden md:inline">Завершить урок</span></button> : <div className="px-6 py-3 bg-green-500/10 text-green-500 border border-green-500/20 font-bold rounded-2xl flex items-center gap-2"><CheckCircle size={18} /><span className="hidden md:inline">Пройдено</span></div>}
                    <button onClick={() => setIsTheaterMode(!isTheaterMode)} className="p-3 bg-kiddy-surfaceHighlight border border-white/[0.08] rounded-2xl text-kiddy-textSecondary hover:text-white transition-all hidden md:block">{isTheaterMode ? <Minimize2 size={20} /> : <Maximize2 size={20} />}</button>
                </div>
            </div>
            <div className={`grid grid-cols-1 ${isTheaterMode ? 'gap-12' : 'lg:grid-cols-3 gap-10'}`}>
                    <div className={`${isTheaterMode ? 'lg:col-span-3' : 'lg:col-span-2'} space-y-8`}><Card className="relative aspect-video bg-black border-white/[0.08] shadow-2xl overflow-hidden rounded-[2rem]" noPadding>{getVideoComponent(activeLesson.videoUrl)}</Card></div>
                    {!isTheaterMode && (
                        <div className="space-y-6">
                            <Card className="bg-kiddy-cherry/5 border-kiddy-cherry/20 p-8 flex flex-col justify-between h-fit">
                                <div>
                                    <div className="w-12 h-12 bg-kiddy-cherry/10 rounded-2xl flex items-center justify-center mb-6 border border-kiddy-cherry/20">
                                        <Zap className="text-kiddy-cherry" size={24} />
                                    </div>
                                    <h3 className="text-white font-bold text-lg mb-3">Практика</h3>
                                    {activeLesson.homeworkTask ? (
                                        <div className="mb-6">
                                            <p className="text-kiddy-textSecondary text-xs font-bold uppercase tracking-widest mb-3">Задание:</p>
                                            <div className="bg-black/50 border border-white/[0.08] rounded-xl p-4 mb-4">
                                                <p className="text-white text-sm leading-relaxed whitespace-pre-wrap">{activeLesson.homeworkTask}</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="text-kiddy-textMuted text-sm leading-relaxed mb-10">Задание не задано для этого урока.</p>
                                    )}
                                </div>
                                {activeLesson.homeworkTask && (
                                    <>
                                        {isHomeworkCompleted ? (
                                            <div className="w-full py-4 bg-green-500/10 border border-green-500/30 text-green-500 font-bold rounded-2xl flex items-center justify-center gap-2">
                                                <CheckCircle size={18} /> Задание выполнено
                                            </div>
                                        ) : (
                                            <button 
                                                onClick={() => setIsHomeworkOpen(true)} 
                                                className="w-full py-4 bg-kiddy-cherry text-white font-bold rounded-2xl hover:bg-kiddy-cherryHover transition-all flex items-center justify-center gap-2"
                                            >
                                                <PenTool size={18} /> Сдать работу
                                            </button>
                                        )}
                                    </>
                                )}
                            </Card>
                        </div>
                    )}
                </div>
            <Modal isOpen={isHomeworkOpen} onClose={() => setIsHomeworkOpen(false)} maxWidth={aiFeedback ? "max-w-6xl" : "max-w-xl"} transparentContainer>
                <div className="flex flex-col md:flex-row gap-4 h-full md:items-center md:justify-center transition-all duration-700 ease-out p-4 md:p-0">
                    {/* Левая модалка - отправка ДЗ */}
                    <div className={`p-6 md:p-10 flex flex-col min-h-0 bg-kiddy-surfaceElevated border border-white/5 rounded-[2rem] md:rounded-[3rem] ${aiFeedback ? 'w-full md:w-[500px] flex-shrink-0 animate-bounce-left' : 'w-full transition-all duration-700 ease-out'}`}>
                        <h2 className="text-xl md:text-2xl font-display font-bold text-white mb-4 md:mb-6">Ваше решение</h2>
                        {activeLesson?.homeworkTask && (
                            <div className="mb-4 md:mb-6 p-3 md:p-4 bg-kiddy-surfaceHighlight/50 border border-white/[0.08] rounded-xl">
                                <p className="text-kiddy-textSecondary text-xs font-bold uppercase tracking-widest mb-2">Задание:</p>
                                <p className="text-white text-sm leading-relaxed whitespace-pre-wrap">{activeLesson.homeworkTask}</p>
                            </div>
                        )}
                        <textarea 
                            value={homeworkAnswer} 
                            onChange={(e) => setHomeworkAnswer(e.target.value)}
                            onFocus={(e) => {
                                // Автоскролл к textarea когда она получает фокус (для мобильных)
                                setTimeout(() => {
                                    e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                }, 300);
                            }}
                            className="min-h-[200px] md:min-h-0 md:flex-1 bg-black border border-white/[0.08] p-4 md:p-6 rounded-xl md:rounded-2xl text-white outline-none focus:border-kiddy-cherry transition-all font-mono text-sm resize-none" 
                            placeholder="Вставьте ваш код или текст..." 
                        />
                        {securityError && (
                            <div className="mt-4 text-red-500 text-xs font-bold">{securityError}</div>
                        )}
                        <div className="mt-4 md:mt-8 flex gap-3 md:gap-4 flex-shrink-0">
                            <button onClick={() => setIsHomeworkOpen(false)} className="px-6 md:px-8 py-3 md:py-4 bg-kiddy-surfaceHighlight text-white font-bold rounded-xl text-sm md:text-base">
                                Закрыть
                            </button>
                        <button 
                            onClick={handleCheckHomework} 
                            disabled={isChecking || !activeLesson?.homeworkTask || isHomeworkCompleted} 
                            className="flex-1 py-3 md:py-4 bg-kiddy-cherry text-white font-bold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm md:text-base"
                        >
                            {isChecking ? <Loader2 className="animate-spin" size={20} /> : isHomeworkCompleted ? <><CheckCircle size={18} /> Уже решено</> : <><Send size={18} /> Проверить</>}
                        </button>
                        </div>
                    </div>
                    
                    {/* Правая модалка - ответ нейронки */}
                    {aiFeedback && (
                        <div className="p-6 md:p-10 flex flex-col min-h-[300px] md:min-h-0 md:h-full bg-kiddy-surfaceElevated border border-white/5 rounded-[2rem] md:rounded-[3rem] w-full md:w-[500px] flex-shrink-0 animate-slide-in-right">
                            <div className="flex items-center justify-between mb-4 md:mb-6 flex-shrink-0">
                                <h2 className="text-xl md:text-2xl font-display font-bold text-white flex items-center gap-2">
                                    <Sparkles size={24} className="text-kiddy-cherry" />
                                    Ответ от наставника
                                </h2>
                                <button 
                                    onClick={() => setAiFeedback(null)} 
                                    className="p-2 hover:bg-kiddy-surfaceHighlight rounded-lg transition-colors"
                                >
                                    <X size={20} className="text-kiddy-textSecondary" />
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0">
                                <div className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap pb-4">
                                    {aiFeedback}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </Modal>
        </div>
    );
  }

  return (
    <div className="animate-slide-up space-y-12">
      <header><h1 className="text-4xl md:text-5xl font-display font-bold text-white tracking-tighter">Библиотека <span className="text-kiddy-cherry">Курсов</span></h1><p className="text-kiddy-textMuted mt-2 font-medium">Ваш путь к мастерству в IT.</p></header>
      {courses.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-4">
            <AnimatedEmptyState message={loadError || "Курсы загружаются или временно недоступны"} />
            <button onClick={() => loadData(false, true)} className="px-6 py-2 bg-kiddy-surfaceHighlight border border-white/[0.08] rounded-xl text-xs font-bold text-white hover:bg-[#2a2a2a] transition-colors">
              Повторить
            </button>
          </div>
      ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {courses.map((course, i) => (
              <Card key={course.id} noPadding className="group cursor-pointer bg-black border-white/[0.06] hover:border-kiddy-cherry/30 transition-all overflow-hidden rounded-2xl flex flex-col h-full hover-lift" onClick={() => setActiveCourse(course)} style={{ animation: `reveal-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) both`, animationDelay: `${0.1 + i * 0.1}s` }}>
                <div className="aspect-[16/10] relative overflow-hidden"><img src={course.coverImage || 'https://picsum.photos/400/250'} className={`absolute inset-0 w-full h-full object-cover transition-all duration-800 ease-entrance group-hover:scale-110 ${course.progress === 100 ? 'grayscale-0' : 'grayscale'}`} alt="" /><div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" /></div>
                <div className="p-8 space-y-4 flex-1 flex flex-col justify-between">
                    <div><h3 className="text-white font-bold text-xl group-hover:text-kiddy-cherry transition-colors">{course.title}</h3><p className="text-kiddy-textMuted text-xs line-clamp-2 mt-2 leading-relaxed">{course.description}</p></div>
                    <div className="space-y-4 pt-4"><div className="flex justify-between items-end"><span className="text-[10px] font-bold text-kiddy-textMuted uppercase tracking-widest">Прогресс</span><span className="text-xs font-bold text-white">{course.progress}%</span></div><div className="h-1.5 w-full bg-kiddy-surfaceHighlight rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-kiddy-cherry to-kiddy-cherryHover rounded-full transition-all duration-1000" style={{ width: `${course.progress}%` }} /></div></div>
                </div>
              </Card>
            ))}
          </div>
      )}
      {!activeLesson && courseForModal && (
        <Modal
          isOpen={!!activeCourse}
          onClose={() => { setClosingCourse(activeCourse ?? null); setActiveCourse(null); }}
          onClosed={() => setClosingCourse(null)}
          maxWidth="max-w-4xl"
        >
            <div className="flex flex-col h-full bg-kiddy-surfaceElevated"><div className="relative h-64 md:h-80 shrink-0"><img src={courseForModal.coverImage} className="w-full h-full object-cover opacity-40" alt="" /><div className="absolute inset-0 bg-gradient-to-t from-zinc-950 to-transparent" /><button onClick={() => { setClosingCourse(activeCourse ?? null); setActiveCourse(null); }} className="absolute top-8 right-8 p-3 bg-black/80 backdrop-blur-sm rounded-2xl text-white"><X size={20} /></button><div className="absolute bottom-10 left-10"><h2 className="text-4xl md:text-5xl font-display font-bold text-white italic">{courseForModal.title}</h2><p className="text-kiddy-textSecondary mt-2 max-w-lg">{courseForModal.description}</p></div></div><div className="flex-1 overflow-y-auto p-10 no-scrollbar space-y-12">{courseForModal.modules.map((module) => (<div key={module.id} className="space-y-6"><div className="flex items-center gap-4"><div className="h-px flex-1 bg-kiddy-surfaceHighlight" /><h3 className="text-kiddy-textMuted font-bold uppercase text-[10px] tracking-[0.4em] px-4 whitespace-nowrap">{module.title}</h3><div className="h-px flex-1 bg-kiddy-surfaceHighlight" /></div><div className="grid grid-cols-1 md:grid-cols-2 gap-4">{module.lessons.map((lesson, idx) => (<div key={lesson.id} onClick={() => handleOpenLesson(lesson)} className={`p-6 rounded-[2rem] border transition-all flex items-center justify-between group ${lesson.locked ? 'bg-kiddy-surfaceElevated/20 border-white/[0.08]/50 opacity-40 cursor-not-allowed' : 'bg-black border-white/[0.08] cursor-pointer hover:border-kiddy-cherry/50 hover:bg-kiddy-surfaceHighlight/30'}`}><div className="flex items-center gap-5"><div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-display font-bold text-sm ${lesson.isCompleted ? 'bg-green-500/10 text-green-500' : 'bg-kiddy-surfaceHighlight text-kiddy-textMuted group-hover:bg-kiddy-cherry group-hover:text-white transition-colors duration-300'}`}>{lesson.isCompleted ? <CheckCircle size={18} /> : (idx + 1)}</div><div><h4 className="text-white font-bold text-sm">{lesson.title}</h4><p className="text-[10px] text-kiddy-textMuted uppercase tracking-widest mt-1">15 минут</p></div></div>{lesson.locked && <Lock size={16} className="text-zinc-800" />}</div>))}</div></div>))}</div></div>
        </Modal>
      )}
      
      {isTransitioning && (
        <div className="fixed inset-0 z-[600] flex flex-col items-center justify-center bg-kiddy-base/95 backdrop-blur-2xl" style={{ animation: 'lessonTransition 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards' }}>
          <AnimatedLearningScene />
          <style>{`
            @keyframes lessonTransition {
              0% { opacity: 0; }
              12% { opacity: 1; }
              80% { opacity: 1; }
              100% { opacity: 0; }
            }
          `}</style>
        </div>
      )}
    </div>
  );
};
