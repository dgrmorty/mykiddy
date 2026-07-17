
import React, { useState, useEffect, useRef, useMemo } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
gsap.registerPlugin(useGSAP);
import { Card } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import { 
    X, ArrowLeft, Loader2, 
    Maximize2, Minimize2, MonitorPlay, CheckCircle, Lock, Search
} from 'lucide-react';
import { HomeworkIsland } from '../components/HomeworkIsland';
import { Course, CourseYearTier, COURSE_YEAR_LABELS, Lesson } from '../types';
import { contentService, invalidateCoursesCache, CoursesLoadError } from '../services/contentService';
import { useAuth } from '../contexts/AuthContext';

import { sanitizeInput, isPotentialInjection } from '../utils/security';
import { useContentContext } from '../contexts/ContentContext';
import { supabase } from '../services/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';
import { useToast } from '../contexts/ToastContext';

import { AnimatedEmptyState } from '../components/ui/AnimatedEmptyState';
import { AnimatedLearningScene } from '../components/ui/AnimatedLearningScene';
import { LessonVideoPlayer } from '../components/LessonVideoPlayer';
import { isBunnyLessonVideo } from '../services/bunnyVideoService';

const HW_MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const HW_MAX_VIDEO_BYTES = 12 * 1024 * 1024;
const HW_MAX_FILES = 6;
/** Минимум символов, если сдаёте только текстом (без фото/видео). */
/** Минимум символов для текстовой сдачи (без файлов). */
const HW_TEXT_ONLY_MIN_LEN = 1;

type HomeworkLocalMedia = {
  id: string;
  mime: string;
  base64: string;
  preview: string;
  name: string;
};

type ResubmitAfterRejectionResult =
  | { ok: true; via: 'update' | 'rpc' }
  | { ok: true; via: 'already_pending'; id: string }
  | { ok: true; via: 'already_approved'; id: string }
  | { ok: false; message: string };

/** Повтор после rejected: UPDATE по RLS; 0 строк — сверка с БД; затем RPC, если миграция с политикой не накатывалась. */
async function resubmitAfterRejection(
  client: SupabaseClient,
  args: {
    userId: string;
    lessonId: string;
    submissionId: string;
    resubmitPayload: Record<string, unknown>;
    answerForRpc: string;
    attachmentsForRpc: unknown;
  },
): Promise<ResubmitAfterRejectionResult> {
  const { userId, lessonId, submissionId, resubmitPayload, answerForRpc, attachmentsForRpc } = args;
  const { data: updated, error } = await client
    .from('homework_submissions')
    .update(resubmitPayload)
    .eq('id', submissionId)
    .eq('user_id', userId)
    .eq('status', 'rejected')
    .select('id')
    .maybeSingle();
  if (error) return { ok: false, message: error.message };
  if (updated?.id) return { ok: true, via: 'update' };

  const { data: row, error: fetchErr } = await client
    .from('homework_submissions')
    .select('id,status')
    .eq('user_id', userId)
    .eq('lesson_id', lessonId)
    .maybeSingle();
  if (fetchErr) return { ok: false, message: fetchErr.message };
  if (row?.status === 'pending' && row.id) return { ok: true, via: 'already_pending', id: row.id };
  if (row?.status === 'approved' && row.id) return { ok: true, via: 'already_approved', id: row.id };

  const { error: rpcErr } = await client.rpc('student_resubmit_homework', {
    p_submission_id: submissionId,
    p_answer: answerForRpc,
    p_attachments: attachmentsForRpc,
  });
  if (!rpcErr) return { ok: true, via: 'rpc' };

  const rpcMsg = (rpcErr.message || '').toLowerCase();
  if (
    rpcMsg.includes('does not exist') ||
    rpcMsg.includes('could not find') ||
    rpcErr.code === '42883' ||
    rpcErr.code === 'PGRST202'
  ) {
    return {
      ok: false,
      message:
        'Повторная отправка не настроена в базе. Открой Supabase → SQL Editor, вставь и выполни скрипт из файла репозитория supabase/APPLY_HOMEWORK_RESUBMIT.sql (или примени миграции 20260504120000 и 20260504140000).',
    };
  }
  return { ok: false, message: rpcErr.message };
}

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

const CourseIsland = ({ course, onClick, index }: any) => {
  const [expanded, setExpanded] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    if (!ref.current) return;
    gsap.to(ref.current.querySelector('.course-pill'), {
      height: expanded ? '100%' : 56,
      borderRadius: expanded ? 24 : 28,
      backgroundColor: expanded ? 'rgba(0,0,0,0.85)' : 'rgba(0,0,0,0.5)',
      backdropFilter: expanded ? 'blur(16px)' : 'blur(8px)',
      padding: expanded ? 24 : 8,
      duration: 0.6,
      ease: 'elastic.out(1, 0.75)'
    });
    gsap.to(ref.current.querySelector('.course-details'), {
      opacity: expanded ? 1 : 0,
      y: expanded ? 0 : 10,
      duration: expanded ? 0.3 : 0.2,
      display: expanded ? 'flex' : 'none'
    });
  }, [expanded]);

  return (
    <div 
      ref={ref}
      className="relative aspect-[16/10] rounded-[2rem] overflow-hidden cursor-pointer group shadow-island border border-white/10"
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      onClick={onClick}
      style={{ animation: `reveal-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) both`, animationDelay: `${index * 0.1}s` }}
    >
      <img src={course.coverImage || 'https://picsum.photos/400/250'} className={`absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105 ${course.progress === 100 ? 'grayscale-0' : 'grayscale'}`} alt="" />
      
      <div className="absolute inset-x-3 bottom-3 flex items-end">
        <div className="course-pill w-full bg-black/50 backdrop-blur-md border border-white/10 overflow-hidden flex flex-col justify-end" style={{ height: 56, borderRadius: 28, padding: 8 }}>
          <div className="flex items-center justify-between px-3 shrink-0">
            <span className="text-white font-bold truncate text-sm">{course.title}</span>
            <span className="text-black font-bold text-[10px] bg-white px-2.5 py-1 rounded-full">{course.progress}%</span>
          </div>
          <div className="course-details hidden opacity-0 flex-col gap-4 mt-4 min-h-0">
            <p className="text-zinc-300 text-xs leading-relaxed line-clamp-3">{course.description}</p>
            <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden shrink-0 mt-auto">
              <div className="h-full bg-white rounded-full" style={{ width: `${course.progress}%` }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export const CourseDetail: React.FC = () => {
  const { user } = useAuth();
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
  /** Строка homework_submissions для повторной отправки после rejected (RLS не даёт простой update). */
  const [homeworkSubmissionId, setHomeworkSubmissionId] = useState<string | null>(null);
  /** Комментарий админа при отклонении — показываем в карточке ДЗ, не только тостом. */
  const [homeworkRejectionComment, setHomeworkRejectionComment] = useState<string | null>(null);
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
    setHomeworkSubmissionId(null);
    setHomeworkRejectionComment(null);
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
            .then(({ data, error }) => {
              if (error) {
                console.warn('[Homework] load status', error.message);
                setHomeworkStatus('none');
                setIsHomeworkCompleted(false);
                setHomeworkSubmissionId(null);
                setHomeworkRejectionComment(null);
                return;
              }
              const st = (data?.status as 'none' | 'pending' | 'approved' | 'rejected') || (data ? 'approved' : 'none');
              setHomeworkStatus(st);
              setIsHomeworkCompleted(!!data && st === 'approved');
              setHomeworkSubmissionId(data?.id ?? null);
              if (st === 'rejected') {
                const c = typeof data?.admin_comment === 'string' ? data.admin_comment.trim() : '';
                setHomeworkRejectionComment(c.length > 0 ? c : null);
              } else {
                setHomeworkRejectionComment(null);
              }
            });
    } else {
        setIsHomeworkCompleted(false);
        setHomeworkStatus('none');
        setHomeworkSubmissionId(null);
        setHomeworkRejectionComment(null);
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
    if (homeworkStatus === 'rejected' && !homeworkSubmissionId) {
      showToast('Не удалось определить прошлую попытку. Обновите страницу.', 'error');
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
      const attachmentsPayload = attachments.length > 0 ? attachments : null;
      const answerForRpc = answerTrimmed.length > 0 ? cleanAnswer : '';

      const applyResubmitResult = (res: ResubmitAfterRejectionResult, stableSubmissionId: string) => {
        if (!res.ok) throw new Error(res.message);
        if (res.via === 'already_pending') {
          setHomeworkSubmissionId(res.id);
          setHomeworkStatus('pending');
          setHomeworkRejectionComment(null);
          showToast('ДЗ уже на проверке у администратора.', 'info');
          return;
        }
        if (res.via === 'already_approved') {
          setHomeworkSubmissionId(res.id);
          setIsHomeworkCompleted(true);
          setHomeworkStatus('approved');
          setHomeworkRejectionComment(null);
          showToast('Это ДЗ уже принято.', 'info');
          return;
        }
        setHomeworkSubmissionId(stableSubmissionId);
        setHomeworkStatus('pending');
        setHomeworkRejectionComment(null);
        showToast('Новая версия отправлена на проверку.', 'success');
      };

      const resubmitPayload = {
        status: 'pending' as const,
        answer: answerTrimmed.length > 0 ? cleanAnswer : null,
        attachments: attachmentsPayload,
        admin_comment: null,
        reviewed_by: null,
        reviewed_at: null,
        xp_awarded: 0,
        submitted_at: new Date().toISOString(),
      };

      if (homeworkStatus === 'rejected' && homeworkSubmissionId) {
        const res = await resubmitAfterRejection(supabase, {
          userId: user.id,
          lessonId: activeLesson.id,
          submissionId: homeworkSubmissionId,
          resubmitPayload,
          answerForRpc,
          attachmentsForRpc: attachmentsPayload,
        });
        applyResubmitResult(res, homeworkSubmissionId);
      } else {
        const { data: inserted, error } = await supabase
          .from('homework_submissions')
          .insert({
            user_id: user.id,
            lesson_id: activeLesson.id,
            status: 'pending',
            answer: answerTrimmed.length > 0 ? cleanAnswer : null,
            attachments: attachmentsPayload,
            xp_awarded: 0,
          })
          .select('id')
          .single();
        if (error?.code === '23505' && activeLesson?.id) {
          const { data: existing, error: fetchErr } = await supabase
            .from('homework_submissions')
            .select('id,status')
            .eq('user_id', user.id)
            .eq('lesson_id', activeLesson.id)
            .maybeSingle();
          if (fetchErr) throw fetchErr;
          if (existing?.status === 'rejected' && existing.id) {
            const res = await resubmitAfterRejection(supabase, {
              userId: user.id,
              lessonId: activeLesson.id,
              submissionId: existing.id,
              resubmitPayload,
              answerForRpc,
              attachmentsForRpc: attachmentsPayload,
            });
            applyResubmitResult(res, existing.id);
          } else if (existing?.status === 'pending') {
            setHomeworkSubmissionId(existing.id);
            setHomeworkStatus('pending');
            showToast('ДЗ уже в обработке.', 'info');
          } else if (existing?.status === 'approved') {
            setHomeworkSubmissionId(existing.id);
            setIsHomeworkCompleted(true);
            setHomeworkStatus('approved');
            showToast('Это ДЗ уже принято.', 'info');
          } else {
            throw error;
          }
        } else {
          if (error) throw error;
          if (inserted?.id) setHomeworkSubmissionId(inserted.id);
          setHomeworkStatus('pending');
          showToast('ДЗ отправлено на проверку. Статус: «в обработке»', 'success');
        }
      }
    } catch (e: any) {
      console.warn('[Homework] submit failed', e?.message || e);
      const code = e?.code as string | undefined;
      const msg = String(e?.message || '').toLowerCase();
      let userMsg = 'Не удалось отправить ДЗ. Попробуйте позже.';
      if (code === '42501' || msg.includes('permission denied') || msg.includes('new row violates row-level security')) {
        userMsg = 'Нет доступа к сохранению. Выйдите и войдите снова; если не поможет — напишите администратору (нужна миграция RLS в Supabase).';
      } else if (msg.includes('payload') || msg.includes('too large') || msg.includes('request entity too large')) {
        userMsg = 'Слишком тяжёлые вложения — уменьшите фото или видео и попробуйте снова.';
      } else if (e?.message && typeof e.message === 'string' && e.message.length < 200) {
        userMsg = e.message;
      }
      showToast(userMsg, 'error');
    } finally {
      setIsChecking(false);
    }
  };

  const getVideoComponent = (url?: string) => {
    if (!url) return <div className="absolute inset-0 flex flex-col items-center justify-center bg-kiddy-surfaceElevated"><MonitorPlay size={48} className="text-zinc-800 mb-4" /><p className="text-kiddy-textMuted font-bold uppercase tracking-widest text-[10px]">Видео недоступно</p></div>;
    if (isBunnyLessonVideo(url)) {
      return (
        <LessonVideoPlayer
          videoUrl={url}
          quizCues={activeLesson?.quizCues}
          lessonId={activeLesson?.id}
        />
      );
    }
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
      <LessonVideoPlayer
        videoUrl={url}
        quizCues={activeLesson?.quizCues}
        lessonId={activeLesson?.id}
      />
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
                    <button onClick={() => setActiveLesson(null)} className="p-3 bg-white/5 border border-white/[0.08] rounded-2xl text-kiddy-textSecondary hover:text-white hover:bg-white/10 transition-all"><ArrowLeft size={20} /></button>
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
                    {!activeLesson.isCompleted ? <button onClick={handleCompleteLesson} disabled={lessonCompleting} className="px-6 py-3 bg-white text-black font-bold rounded-2xl hover:bg-zinc-200 transition-all flex items-center gap-2">{lessonCompleting ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle size={18} />}<span className="hidden md:inline">Завершить урок</span></button> : <div className="px-6 py-3 bg-white/10 text-white border border-white/20 font-bold rounded-2xl flex items-center gap-2"><CheckCircle size={18} /><span className="hidden md:inline">Пройдено</span></div>}
                    <button onClick={() => setIsTheaterMode(!isTheaterMode)} className="p-3 bg-white/5 border border-white/[0.08] rounded-2xl text-kiddy-textSecondary hover:text-white hover:bg-white/10 transition-all hidden md:block">{isTheaterMode ? <Minimize2 size={20} /> : <Maximize2 size={20} />}</button>
                </div>
            </div>
            <div className={`grid grid-cols-1 ${isTheaterMode ? 'gap-12' : 'lg:grid-cols-3 gap-10'}`}>
                    <div className={`${isTheaterMode ? 'lg:col-span-3' : 'lg:col-span-2'} space-y-8`}><Card className="relative aspect-video bg-black border-white/[0.08] shadow-2xl overflow-hidden rounded-[2rem]" noPadding>{getVideoComponent(activeLesson.videoUrl)}</Card></div>
                    {!isTheaterMode && (
                        <div className="flex flex-col justify-start pt-1 lg:pt-2">
                            <HomeworkIsland
                                task={activeLesson.homeworkTask}
                                status={homeworkStatus}
                                isCompleted={isHomeworkCompleted}
                                rejectionComment={homeworkRejectionComment}
                                answer={homeworkAnswer}
                                onAnswerChange={setHomeworkAnswer}
                                media={homeworkMedia}
                                onPickFiles={() => homeworkFileInputRef.current?.click()}
                                onRemoveMedia={(id) => setHomeworkMedia((p) => p.filter((x) => x.id !== id))}
                                fileInputRef={homeworkFileInputRef}
                                onFilesSelected={(files) => void addHomeworkFiles(files)}
                                canSubmit={homeworkCanSubmit}
                                isChecking={isChecking}
                                securityError={securityError}
                                onSubmit={() => void handleCheckHomework()}
                            />
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
            Библиотека <span className="text-white">Курсов</span>
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
                  ? 'bg-white text-black shadow-premium'
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
                  librarySearchFocused || librarySearch.trim() !== '' ? 'text-white' : ''
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
            className="w-full rounded-2xl border border-white/[0.08] bg-black/40 py-3.5 pl-[3.25rem] pr-4 text-sm text-white placeholder:text-kiddy-textMuted outline-none backdrop-blur-sm transition-colors focus:border-white/30 selection:bg-white/30"
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
              className="mt-6 rounded-xl border border-white/[0.1] bg-white/[0.04] px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white transition-colors hover:border-white/30 hover:bg-white/10"
            >
              Сбросить поиск
            </button>
          </div>
      ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredCourses.map((course, i) => (
              <CourseIsland key={course.id} course={course} index={i} onClick={() => setActiveCourse(course)} />
            ))}
          </div>
      )}
      {!activeLesson && courseForModal && (
        <Modal
          isOpen={!!activeCourse}
          onClose={() => { setClosingCourse(activeCourse ?? null); setActiveCourse(null); }}
          onClosed={() => setClosingCourse(null)}
          maxWidth="max-w-5xl"
          mobileCentered
          maxPanelHeight="min(88dvh, calc(100dvh - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px) - 2rem))"
          panelClassName="ring-1 ring-white/10 shadow-premium"
        >
            <div className="flex flex-col bg-[#0a0a0a]">
              <div className="relative h-44 shrink-0 overflow-hidden sm:h-60 md:h-72 lg:h-80">
                <div className="pointer-events-none absolute inset-0 z-[3] bg-gradient-to-b from-black/50 via-transparent to-transparent" />
                <img
                  src={courseForModal.coverImage}
                  className="h-full w-full scale-105 object-cover opacity-[0.55]"
                  alt=""
                />
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/80 to-zinc-950/20" />
                <div className="absolute inset-x-0 top-0 z-[2] h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                <button
                  type="button"
                  onClick={() => { setClosingCourse(activeCourse ?? null); setActiveCourse(null); }}
                  className="absolute right-4 top-4 z-20 flex size-11 shrink-0 items-center justify-center rounded-full border border-white/10 bg-black/60 text-white backdrop-blur-md transition-all hover:border-white/20 hover:bg-black/80 md:right-6 md:top-5 md:size-12"
                  aria-label="Закрыть"
                >
                  <X size={20} />
                </button>
                <div className="absolute bottom-0 left-0 right-0 z-[2] p-4 pb-5 sm:p-7 sm:pb-7 md:p-9 md:pb-8">
                  <h2 className="font-display text-balance text-xl font-bold italic leading-[1.15] text-white break-words sm:text-3xl md:text-4xl lg:text-[2.75rem] lg:leading-tight">
                    {courseForModal.title}
                  </h2>
                  <p className="mt-3 max-w-3xl text-pretty text-sm leading-relaxed text-zinc-400 line-clamp-2 sm:line-clamp-3 md:text-base md:leading-relaxed lg:line-clamp-none">
                    {courseForModal.description}
                  </p>
                  <div className="mt-4 w-full max-w-sm">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Прогресс</span>
                      <span className="font-display text-lg font-bold tabular-nums text-white sm:text-xl">
                        {courseForModal.progress}%
                      </span>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/10 ring-1 ring-white/5">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ease-out ${
                          courseForModal.progress >= 100 ? 'bg-kiddy-cherry' : 'bg-white'
                        }`}
                        style={{ width: `${Math.min(100, Math.max(courseForModal.progress, courseForModal.progress > 0 ? 6 : 0))}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="space-y-8 border-t border-white/[0.06] bg-[#0a0a0a] px-4 py-6 pb-8 sm:px-7 md:space-y-12 md:px-10 md:py-9 md:pb-14">
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
                              : 'group cursor-pointer border-white/[0.07] bg-[#000000] shadow-[0_1px_0_0_rgba(255,255,255,0.04)_inset] hover:border-white/30 hover:shadow-premium'
                          }`}
                        >
                          <div
                            className={`w-10 h-10 shrink-0 rounded-2xl flex items-center justify-center font-display font-bold text-sm ${
                              lesson.isCompleted
                                ? 'bg-white text-black'
                                : 'bg-white/5 text-kiddy-textMuted group-hover:bg-white group-hover:text-black transition-colors duration-300'
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
          className="fixed inset-0 z-[600] flex flex-col items-center justify-center bg-[#000000] backdrop-blur-2xl"
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
