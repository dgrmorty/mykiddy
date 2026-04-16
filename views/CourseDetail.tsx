
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Card } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import { 
    X, ArrowLeft, Send, Loader2, 
    Maximize2, Minimize2, MonitorPlay, Zap, CheckCircle, Lock, Search, ImagePlus, Trash2
} from 'lucide-react';
import { Course, CourseYearTier, COURSE_YEAR_LABELS, Lesson } from '../types';
import { contentService, invalidateCoursesCache, CoursesLoadError } from '../services/contentService';
import { useAuth } from '../contexts/AuthContext';

import { sanitizeInput, isPotentialInjection } from '../utils/security';
import { useContentContext } from '../contexts/ContentContext';
import { supabase } from '../services/supabase';
import { useToast } from '../contexts/ToastContext';

import { AnimatedEmptyState } from '../components/ui/AnimatedEmptyState';
import { AnimatedLearningScene } from '../components/ui/AnimatedLearningScene';

const HW_MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const HW_MAX_VIDEO_BYTES = 12 * 1024 * 1024;
const HW_MAX_FILES = 6;
/** Минимум символов, если сдаёте только текстом (без фото/видео). */
const HW_TEXT_ONLY_MIN_LEN = 12;

type HomeworkLocalMedia = {
  id: string;
  mime: string;
  base64: string;
  preview: string;
  name: string;
};

function readOneFileAsAttachment(file: File): Promise<{ mime: string; base64: string; preview: string } | null> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const s = reader.result as string;
      const m = s.match(/^data:([^;]+);base64,(.+)$/);
      if (!m) {
        resolve(null);
        return;
      }
      resolve({ mime: m[1], base64: m[2], preview: s });
    };
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}

export const CourseDetail: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const { activeCourse, setActiveCourse, activeLesson, setActiveLesson } = useContentContext();
  const { showToast } = useToast();
  
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [videoLoading, setVideoLoading] = useState(true);
  const [isTheaterMode, setIsTheaterMode] = useState(false);
  const [homeworkAnswer, setHomeworkAnswer] = useState('');
  const [homeworkMedia, setHomeworkMedia] = useState<HomeworkLocalMedia[]>([]);
  const homeworkFileInputRef = useRef<HTMLInputElement>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [securityError, setSecurityError] = useState<string | null>(null);
  const [lessonCompleting, setLessonCompleting] = useState(false);
  const [isHomeworkCompleted, setIsHomeworkCompleted] = useState(false);
  const [homeworkStatus, setHomeworkStatus] = useState<'none' | 'pending' | 'approved' | 'rejected'>('none');
  const [closingCourse, setClosingCourse] = useState<Course | null>(null);
  
  // Анимация перехода в урок
  const [isTransitioning, setIsTransitioning] = useState(false);

  const playerRef = useRef<HTMLDivElement>(null);
  const courseForModal = activeCourse || closingCourse;

  const [libraryYear, setLibraryYear] = useState<CourseYearTier>(() => {
    try {
      const s = sessionStorage.getItem('kiddy_library_year');
      if (s === 'year_2_plus' || s === 'year_1') return s;
    } catch {
      /* ignore */
    }
    return 'year_1';
  });

  const [librarySearch, setLibrarySearch] = useState('');
  const [librarySearchFocused, setLibrarySearchFocused] = useState(false);

  useEffect(() => {
    try {
      sessionStorage.setItem('kiddy_library_year', libraryYear);
    } catch {
      /* ignore */
    }
  }, [libraryYear]);

  const coursesInYear = useMemo(
    () => courses.filter((c) => c.yearTier === libraryYear),
    [courses, libraryYear],
  );

  const filteredCourses = useMemo(() => {
    const q = librarySearch.trim().toLowerCase();
    if (!q) return coursesInYear;
    return coursesInYear.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        (c.description || '').toLowerCase().includes(q) ||
        String(c.type || '').toLowerCase().includes(q),
    );
  }, [coursesInYear, librarySearch]);

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

  // При смене урока сбрасываем черновик сдачи
  useEffect(() => {
    setHomeworkMedia([]);
    setHomeworkAnswer('');
    setSecurityError(null);
  }, [activeLesson?.id]);

  useEffect(() => {
    if (activeLesson) setVideoLoading(true);
  }, [activeLesson?.id]);

  useEffect(() => {
    if (activeLesson && playerRef.current) {
        playerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    
    // Проверяем статус ДЗ при смене урока
    if (activeLesson?.id && user.id && user.id !== 'guest') {
        void supabase
            .from('homework_submissions')
            .select('id,status,admin_comment')
            .eq('user_id', user.id)
            .eq('lesson_id', activeLesson.id)
            .maybeSingle()
            .then(({ data }) => {
              const st = (data?.status as any) || (data ? 'approved' : 'none');
              setHomeworkStatus(st);
              setIsHomeworkCompleted(!!data && st === 'approved');
              if (st === 'rejected' && data?.admin_comment) {
                showToast(`ДЗ отклонено: ${data.admin_comment}`, 'error');
              }
            })
            .then(() => {}, () => {
              setHomeworkStatus('none');
              setIsHomeworkCompleted(false);
            });
    } else {
        setIsHomeworkCompleted(false);
        setHomeworkStatus('none');
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

  const homeworkHasMedia = homeworkMedia.length > 0;
  const homeworkTextLen = homeworkAnswer.trim().length;
  /** Достаточно либо фото/видео, либо только текста (не оба сразу). */
  const homeworkCanSubmit =
    !!activeLesson?.homeworkTask &&
    (homeworkHasMedia || homeworkTextLen >= HW_TEXT_ONLY_MIN_LEN);

  const addHomeworkFiles = async (list: FileList | null) => {
    if (!list?.length) return;
    const picked = Array.from(list);
    setHomeworkMedia((prev) => {
      void (async () => {
        let acc = [...prev];
        for (const file of picked) {
          if (acc.length >= HW_MAX_FILES) {
            showToast(`Максимум ${HW_MAX_FILES} файлов`, 'info');
            break;
          }
          const isVid = file.type.startsWith('video/');
          const isImg = file.type.startsWith('image/');
          if (!isImg && !isVid) continue;
          if (isVid && acc.some((x) => x.mime.startsWith('video/'))) {
            showToast('Можно прикрепить только одно видео', 'info');
            continue;
          }
          if (isImg && file.size > HW_MAX_IMAGE_BYTES) {
            showToast(`«${file.name}»: фото до 4 МБ`, 'error');
            continue;
          }
          if (isVid && file.size > HW_MAX_VIDEO_BYTES) {
            showToast(`«${file.name}»: видео до 12 МБ`, 'error');
            continue;
          }
          const data = await readOneFileAsAttachment(file);
          if (!data) {
            showToast(`Не удалось прочитать «${file.name}»`, 'error');
            continue;
          }
          acc = [
            ...acc,
            {
              id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
              mime: data.mime,
              base64: data.base64,
              preview: data.preview,
              name: file.name,
            },
          ];
        }
        setHomeworkMedia(acc);
      })();
      return prev;
    });
  };

  // ДЗ уходит в очередь админ-панели (не в нейросеть).
  const handleCheckHomework = async () => {
    if (!activeLesson?.homeworkTask || !homeworkCanSubmit) return;
    if (user.id === 'guest') {
      showToast('Войдите, чтобы отправить ДЗ на проверку', 'info');
      return;
    }
    if (homeworkStatus === 'pending') {
      showToast('ДЗ уже отправлено. Статус: «в обработке»', 'info');
      return;
    }
    if (isHomeworkCompleted) {
      showToast('ДЗ уже принято!', 'info');
      return;
    }

    setSecurityError(null);
    const cleanAnswer = sanitizeInput(homeworkAnswer);
    if (cleanAnswer.trim().length > 0) {
      const injectionError = isPotentialInjection(cleanAnswer);
      if (injectionError) { setSecurityError(injectionError); return; }
    }
    setIsChecking(true);
    try {
      const attachments = homeworkMedia.map((m) => ({
        mimeType: m.mime,
        dataBase64: m.base64,
        name: m.name,
      }));
      const answerTrimmed = cleanAnswer.trim();
      const { error } = await supabase
        .from('homework_submissions')
        .insert({
          user_id: user.id,
          lesson_id: activeLesson.id,
          status: 'pending',
          answer: answerTrimmed.length > 0 ? cleanAnswer : null,
          attachments: attachments.length > 0 ? attachments : null,
          xp_awarded: 0,
        });
      if (error) throw error;
      setHomeworkStatus('pending');
      showToast('ДЗ отправлено на проверку. Статус: «в обработке»', 'success');
    } catch (e: any) {
      console.warn('[Homework] submit failed', e?.message || e);
      showToast('Не удалось отправить ДЗ. Попробуйте позже.', 'error');
    } finally {
      setIsChecking(false);
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

  if (loading && courses.length === 0) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center" aria-busy="true">
        <div
          className="h-10 w-10 shrink-0 rounded-full border-2 border-white/10 border-t-kiddy-cherry animate-spin"
          style={{ animationDuration: '0.85s' }}
        />
      </div>
    );
  }

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
                            <Card className="bg-kiddy-cherry/5 border-kiddy-cherry/20 p-6 md:p-8 flex flex-col gap-6 h-fit">
                                <div>
                                    <div className="w-12 h-12 bg-kiddy-cherry/10 rounded-2xl flex items-center justify-center mb-6 border border-kiddy-cherry/20">
                                        <Zap className="text-kiddy-cherry" size={24} />
                                    </div>
                                    <h3 className="text-white font-bold text-lg mb-3">Практика</h3>
                                    {activeLesson.homeworkTask ? (
                                        <div className="mb-2">
                                            <p className="text-kiddy-textSecondary text-xs font-bold uppercase tracking-widest mb-3">Задание:</p>
                                            <div className="bg-black/50 border border-white/[0.08] rounded-xl p-4">
                                                <p className="text-white text-sm leading-relaxed whitespace-pre-wrap">{activeLesson.homeworkTask}</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="text-kiddy-textMuted text-sm leading-relaxed">Задание не задано для этого урока.</p>
                                    )}
                                </div>
                                {activeLesson.homeworkTask && (
                                    <>
                                        {isHomeworkCompleted ? (
                                            <div className="w-full py-4 bg-green-500/10 border border-green-500/30 text-green-500 font-bold rounded-2xl flex items-center justify-center gap-2">
                                                <CheckCircle size={18} /> Задание выполнено
                                            </div>
                                        ) : (
                                            <div className="flex flex-col gap-4 border-t border-white/[0.06] pt-6">
                                                <p className="text-[11px] font-medium text-kiddy-textMuted leading-relaxed">
                                                  Отправьте ответ на проверку: можно только текст, только фото/видео или и то и другое.
                                                </p>
                                                <input
                                                    ref={homeworkFileInputRef}
                                                    type="file"
                                                    accept="image/*,video/*"
                                                    multiple
                                                    className="hidden"
                                                    onChange={(e) => {
                                                        void addHomeworkFiles(e.target.files);
                                                        e.target.value = '';
                                                    }}
                                                />
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => homeworkFileInputRef.current?.click()}
                                                        disabled={isChecking || homeworkStatus === 'pending'}
                                                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-kiddy-surfaceHighlight border border-white/[0.08] text-xs font-bold text-kiddy-textSecondary hover:text-white transition-colors disabled:opacity-50"
                                                    >
                                                        <ImagePlus size={16} />
                                                        Фото или видео
                                                    </button>
                                                    <span className="text-[10px] text-kiddy-textMuted font-medium">
                                                        До 6 файлов · фото до 4 МБ · одно видео до 12 МБ
                                                    </span>
                                                </div>
                                                {homeworkMedia.length > 0 && (
                                                    <div className="flex flex-wrap gap-2">
                                                        {homeworkMedia.map((m) => (
                                                            <div key={m.id} className="relative group rounded-xl overflow-hidden border border-white/[0.1]">
                                                                {m.mime.startsWith('video/') ? (
                                                                    <video src={m.preview} className="h-20 w-28 object-cover bg-black" muted playsInline />
                                                                ) : (
                                                                    <img src={m.preview} alt="" className="h-20 w-28 object-cover" />
                                                                )}
                                                                <button
                                                                    type="button"
                                                                    aria-label="Убрать файл"
                                                                    onClick={() => setHomeworkMedia((p) => p.filter((x) => x.id !== m.id))}
                                                                    disabled={isChecking || homeworkStatus === 'pending'}
                                                                    className="absolute top-1 right-1 p-1 rounded-lg bg-black/70 text-white opacity-90 hover:bg-red-600/90 disabled:opacity-40"
                                                                >
                                                                    <Trash2 size={14} />
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                                <textarea
                                                    value={homeworkAnswer}
                                                    onChange={(e) => setHomeworkAnswer(e.target.value)}
                                                    onFocus={(e) => {
                                                        setTimeout(() => {
                                                            e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                        }, 300);
                                                    }}
                                                    disabled={isChecking || homeworkStatus === 'pending'}
                                                    className="min-h-[140px] w-full bg-black border border-white/[0.08] p-4 rounded-xl text-white outline-none focus:border-kiddy-cherry transition-all font-mono text-sm resize-none disabled:opacity-60"
                                                    placeholder={
                                                        homeworkHasMedia
                                                            ? 'Комментарий к файлам — по желанию…'
                                                            : `Только текст — не короче ${HW_TEXT_ONLY_MIN_LEN} символов. Или прикрепите фото/видео без текста.`
                                                    }
                                                />
                                                {securityError && (
                                                    <div className="text-red-500 text-xs font-bold">{securityError}</div>
                                                )}
                                                {homeworkStatus === 'pending' && (
                                                    <p className="text-xs font-bold text-amber-400/95 flex items-center gap-2">
                                                        <Loader2 className="animate-spin shrink-0" size={14} />
                                                        Работа на проверке у администратора
                                                    </p>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={handleCheckHomework}
                                                    disabled={
                                                        isChecking ||
                                                        !activeLesson?.homeworkTask ||
                                                        isHomeworkCompleted ||
                                                        homeworkStatus === 'pending' ||
                                                        !homeworkCanSubmit
                                                    }
                                                    className="w-full py-3.5 bg-kiddy-cherry text-white font-bold rounded-2xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-kiddy-cherryHover transition-all"
                                                >
                                                    {isChecking ? (
                                                        <Loader2 className="animate-spin" size={20} />
                                                    ) : homeworkStatus === 'pending' ? (
                                                        <>
                                                            <Loader2 className="animate-spin" size={18} /> В обработке
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Send size={18} /> Отправить на проверку
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        )}
                                    </>
                                )}
                            </Card>
                        </div>
                    )}
                </div>
        </div>
    );
  }

  return (
    <div className="animate-slide-up space-y-12">
      <header className="space-y-6">
        <div>
          <h1 className="text-4xl md:text-5xl font-display font-bold text-white tracking-tighter">
            Библиотека <span className="text-kiddy-cherry">Курсов</span>
          </h1>
          <p className="text-kiddy-textMuted mt-2 font-medium">Ваш путь к мастерству в IT.</p>
        </div>
        <div
          className="inline-flex rounded-2xl border border-white/[0.08] bg-black/40 p-1 backdrop-blur-sm"
          role="tablist"
          aria-label="Год занятий"
        >
          {(['year_1', 'year_2_plus'] as const).map((tier) => (
            <button
              key={tier}
              type="button"
              role="tab"
              aria-selected={libraryYear === tier}
              onClick={() => setLibraryYear(tier)}
              className={`rounded-xl px-5 py-2.5 text-xs font-bold uppercase tracking-widest transition-all md:px-8 md:py-3 md:text-sm ${
                libraryYear === tier
                  ? 'bg-kiddy-cherry text-white shadow-lg shadow-kiddy-cherry/25'
                  : 'text-kiddy-textMuted hover:text-white'
              }`}
            >
              {tier === 'year_1' ? '1-й год' : '2+ год занятий'}
            </button>
          ))}
        </div>
        <div className="relative max-w-xl isolate">
          <span
            className="pointer-events-none absolute left-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center"
            aria-hidden
          >
            <span
              className={`flex items-center justify-center ${
                !librarySearchFocused && librarySearch.trim() === '' ? 'animate-loupe-pulse' : ''
              }`}
            >
              <Search
                className={`h-[22px] w-[22px] shrink-0 text-kiddy-textMuted transition-colors duration-200 [stroke-linecap:round] [stroke-linejoin:round] ${
                  librarySearchFocused || librarySearch.trim() !== '' ? 'text-kiddy-cherry' : ''
                }`}
                strokeWidth={2}
                absoluteStrokeWidth
              />
            </span>
          </span>
          <input
            type="search"
            value={librarySearch}
            onChange={(e) => setLibrarySearch(e.target.value)}
            onFocus={() => setLibrarySearchFocused(true)}
            onBlur={() => setLibrarySearchFocused(false)}
            placeholder="Поиск по названию, описанию или направлению…"
            className="w-full rounded-2xl border border-white/[0.08] bg-black/40 py-3.5 pl-[3.25rem] pr-4 text-sm text-white placeholder:text-kiddy-textMuted outline-none backdrop-blur-sm transition-colors focus:border-kiddy-cherry/40 selection:bg-kiddy-cherry/30"
            aria-label="Поиск курсов"
          />
        </div>
      </header>
      {courses.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-4">
            <AnimatedEmptyState message={loadError || "Курсы загружаются или временно недоступны"} />
            <button onClick={() => loadData(false, true)} className="px-6 py-2 bg-kiddy-surfaceHighlight border border-white/[0.08] rounded-xl text-xs font-bold text-white hover:bg-[#2a2a2a] transition-colors">
              Повторить
            </button>
          </div>
      ) : coursesInYear.length === 0 ? (
          <div className="rounded-2xl border border-white/[0.06] bg-kiddy-surfaceElevated/50 px-8 py-16 text-center">
            <p className="text-kiddy-textSecondary font-medium">
              В разделе «{COURSE_YEAR_LABELS[libraryYear]}» пока нет курсов.
            </p>
            <p className="text-kiddy-textMuted mt-2 text-sm">Выберите другой год или добавьте курс в админ-панели.</p>
          </div>
      ) : filteredCourses.length === 0 ? (
          <div className="rounded-2xl border border-white/[0.06] bg-kiddy-surfaceElevated/50 px-8 py-16 text-center">
            <p className="text-kiddy-textSecondary font-medium">Ничего не найдено</p>
            <p className="text-kiddy-textMuted mt-2 text-sm">Попробуйте другой запрос или сбросьте поиск.</p>
            <button
              type="button"
              onClick={() => setLibrarySearch('')}
              className="mt-6 rounded-xl border border-white/[0.1] bg-white/[0.04] px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white transition-colors hover:border-kiddy-cherry/35 hover:bg-kiddy-cherry/10"
            >
              Сбросить поиск
            </button>
          </div>
      ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredCourses.map((course, i) => (
              <Card key={course.id} noPadding className="group cursor-pointer bg-black border-white/[0.06] hover:border-kiddy-cherry/30 transition-all overflow-hidden rounded-2xl flex flex-col h-full hover-lift" onClick={() => setActiveCourse(course)} style={{ animation: `reveal-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) both`, animationDelay: `${0.1 + i * 0.1}s` }}>
                <div className="aspect-[16/10] relative overflow-hidden">
                  <img src={course.coverImage || 'https://picsum.photos/400/250'} className={`absolute inset-0 w-full h-full object-cover transition-all duration-800 ease-entrance group-hover:scale-110 ${course.progress === 100 ? 'grayscale-0' : 'grayscale'}`} alt="" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
                  <span className="absolute left-3 top-3 rounded-full border border-white/10 bg-black/60 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-300 backdrop-blur-sm">
                    {COURSE_YEAR_LABELS[course.yearTier]}
                  </span>
                </div>
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
          maxWidth="max-w-5xl"
          maxPanelHeight="calc(100dvh - 0.5rem)"
          panelClassName="ring-1 ring-kiddy-cherry/20 shadow-[0_0_0_1px_rgba(255,255,255,0.05),0_48px_120px_-28px_rgba(0,0,0,0.92),0_0_120px_-48px_rgba(230,0,43,0.14)]"
        >
            <div className="flex flex-col bg-kiddy-surfaceElevated">
              <div className="relative h-[13.5rem] shrink-0 overflow-hidden sm:h-60 md:h-72 lg:h-80">
                <div className="pointer-events-none absolute inset-0 z-[3] bg-gradient-to-b from-kiddy-cherry/15 via-transparent to-transparent" />
                <img
                  src={courseForModal.coverImage}
                  className="h-full w-full scale-105 object-cover opacity-[0.55]"
                  alt=""
                />
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/80 to-zinc-950/20" />
                <div className="absolute inset-x-0 top-0 z-[2] h-px bg-gradient-to-r from-transparent via-kiddy-cherry/60 to-transparent" />
                <button
                  type="button"
                  onClick={() => { setClosingCourse(activeCourse ?? null); setActiveCourse(null); }}
                  className="absolute right-4 top-4 z-20 flex size-11 shrink-0 items-center justify-center rounded-full border border-white/10 bg-black/60 text-white backdrop-blur-md transition-all hover:border-white/20 hover:bg-black/80 md:right-6 md:top-5 md:size-12"
                  aria-label="Закрыть"
                >
                  <X size={20} />
                </button>
                <div className="absolute bottom-0 left-0 right-0 z-[2] p-5 pb-6 sm:p-7 sm:pb-7 md:p-9 md:pb-8">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-black/35 px-3 py-1 backdrop-blur-md">
                      <MonitorPlay size={12} className="text-kiddy-cherry" aria-hidden />
                      <span className="text-[10px] font-bold uppercase tracking-[0.28em] text-zinc-300">Курс</span>
                    </div>
                    <span className="rounded-full border border-kiddy-cherry/30 bg-kiddy-cherry/15 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-kiddy-cherry">
                      {COURSE_YEAR_LABELS[courseForModal.yearTier]}
                    </span>
                  </div>
                  <h2 className="font-display text-balance text-2xl font-bold italic leading-[1.15] text-white break-words sm:text-3xl md:text-4xl lg:text-[2.75rem] lg:leading-tight">
                    {courseForModal.title}
                  </h2>
                  <p className="mt-3 max-w-3xl text-pretty text-sm leading-relaxed text-zinc-400 line-clamp-2 sm:line-clamp-3 md:text-base md:leading-relaxed lg:line-clamp-none">
                    {courseForModal.description}
                  </p>
                  <div className="mt-4 inline-flex items-center gap-3 rounded-2xl border border-kiddy-cherry/25 bg-gradient-to-br from-kiddy-cherry/15 to-transparent px-4 py-2.5">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-kiddy-cherry">Прогресс</span>
                    <span className="font-display text-xl font-bold tabular-nums text-white md:text-2xl">{courseForModal.progress}%</span>
                  </div>
                </div>
              </div>
              <div className="space-y-10 border-t border-white/[0.06] bg-gradient-to-b from-black/25 to-kiddy-surfaceElevated px-5 py-7 pb-12 sm:px-7 md:space-y-12 md:px-10 md:py-9 md:pb-14">
                {courseForModal.modules.map((module) => (
                  <div key={module.id} className="space-y-5 md:space-y-6">
                    <div className="flex items-center gap-3 min-w-0 md:gap-4">
                      <div className="h-px min-w-[1rem] flex-1 bg-gradient-to-r from-transparent to-white/15" />
                      <h3 className="shrink-0 px-2 text-center text-[10px] font-bold uppercase tracking-[0.35em] text-zinc-500 md:px-4 md:tracking-[0.4em]">
                        {module.title}
                      </h3>
                      <div className="h-px min-w-[1rem] flex-1 bg-gradient-to-l from-transparent to-white/15" />
                    </div>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
                      {module.lessons.map((lesson, idx) => (
                        <div
                          key={lesson.id}
                          role="button"
                          tabIndex={lesson.locked ? -1 : 0}
                          onClick={() => handleOpenLesson(lesson)}
                          onKeyDown={(e) => {
                            if (lesson.locked) return;
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              handleOpenLesson(lesson);
                            }
                          }}
                          className={`flex min-w-0 items-start gap-3 rounded-2xl border p-5 transition-all duration-300 md:gap-4 md:rounded-[1.75rem] md:p-6 ${
                            lesson.locked
                              ? 'cursor-not-allowed border-white/[0.06] bg-white/[0.02] opacity-40'
                              : 'group cursor-pointer border-white/[0.07] bg-gradient-to-br from-zinc-950/90 to-black shadow-[0_1px_0_0_rgba(255,255,255,0.04)_inset] hover:border-kiddy-cherry/40 hover:shadow-[0_20px_50px_-24px_rgba(230,0,43,0.25)]'
                          }`}
                        >
                          <div
                            className={`w-10 h-10 shrink-0 rounded-2xl flex items-center justify-center font-display font-bold text-sm ${
                              lesson.isCompleted
                                ? 'bg-green-500/10 text-green-500'
                                : 'bg-kiddy-surfaceHighlight text-kiddy-textMuted group-hover:bg-kiddy-cherry group-hover:text-white transition-colors duration-300'
                            }`}
                          >
                            {lesson.isCompleted ? <CheckCircle size={18} /> : idx + 1}
                          </div>
                          <div className="min-w-0 flex-1 pt-0.5">
                            <h4 className="text-white font-bold text-sm leading-snug break-words line-clamp-3">{lesson.title}</h4>
                            <p className="text-[10px] text-kiddy-textMuted uppercase tracking-widest mt-1.5">15 минут</p>
                          </div>
                          {lesson.locked && <Lock size={16} className="text-zinc-500 shrink-0 mt-1" aria-hidden />}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
        </Modal>
      )}
      
      {isTransitioning && (
        <div
          className="fixed inset-0 z-[600] flex flex-col items-center justify-center bg-kiddy-base/95 backdrop-blur-2xl"
          style={{ animation: 'lessonTransition 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards' }}
          aria-busy="true"
        >
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
