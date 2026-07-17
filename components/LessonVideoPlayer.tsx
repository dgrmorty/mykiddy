import { useCallback, useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { CheckCircle2, Loader2, Maximize2, Minimize2, MonitorPlay, XCircle } from 'lucide-react';
import { fetchLessonVideoPlayUrl, isBunnyLessonVideo } from '../services/bunnyVideoService';
import { supabase } from '../services/supabase';
import type { LessonQuizCue } from '../types';
import { normalizeQuizCues } from '../utils/quizCues';

gsap.registerPlugin(useGSAP);

type Props = {
  videoUrl: string;
  className?: string;
  quizCues?: LessonQuizCue[];
  lessonId?: string;
};

type QuizIslandProps = {
  cue: LessonQuizCue;
  selected: number | null;
  feedback: 'correct' | 'wrong' | null;
  onSelect: (idx: number) => void;
  onSubmit: () => void;
};

/** Dynamic Island: пилюля сверху → раскрытие в карточку вопроса. */
function QuizIsland({ cue, selected, feedback, onSelect, onSubmit }: QuizIslandProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const compactRef = useRef<HTMLDivElement>(null);
  const expandedRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const card = cardRef.current;
      const compact = compactRef.current;
      const expanded = expandedRef.current;
      if (!card || !compact || !expanded) return;

      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      gsap.killTweensOf([card, compact, expanded]);

      const targetH = Math.max(expanded.scrollHeight, 220);
      const targetW = Math.min(380, window.innerWidth - 32);

      if (reduced) {
        gsap.set(card, { width: targetW, height: targetH, borderRadius: 28, opacity: 1 });
        gsap.set(compact, { opacity: 0, visibility: 'hidden' });
        gsap.set(expanded, { opacity: 1, visibility: 'visible' });
        return;
      }

      gsap.set(card, {
        width: 132,
        height: 40,
        borderRadius: 22,
        opacity: 1,
        scale: 0.92,
        y: -14,
      });
      gsap.set(compact, { opacity: 1, visibility: 'visible' });
      gsap.set(expanded, { opacity: 0, visibility: 'hidden' });

      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
      tl.to(card, { scale: 1, y: 0, duration: 0.32 }, 0)
        .to(card, { width: targetW, duration: 0.42 }, 0.1)
        .to(compact, { opacity: 0, duration: 0.12 }, 0.38)
        .set(compact, { visibility: 'hidden' })
        .set(expanded, { visibility: 'visible' })
        .to(card, { height: targetH, borderRadius: 28, duration: 0.48, ease: 'power3.inOut' }, 0.4)
        .fromTo(expanded, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.32 }, 0.52)
        .from(
          expanded.querySelectorAll('[data-quiz-opt]'),
          { opacity: 0, y: 8, stagger: 0.055, duration: 0.26 },
          0.58,
        );
    },
    { dependencies: [cue.id], scope: rootRef },
  );

  return (
    <div
      ref={rootRef}
      className="absolute inset-0 z-30 flex items-start justify-center pt-5 sm:pt-8 px-4"
    >
      <div className="absolute inset-0 bg-black/55 backdrop-blur-[2px]" />
      <div
        ref={cardRef}
        className="relative z-10 overflow-hidden border border-white/12 bg-black/95 shadow-island backdrop-blur-2xl will-change-[width,height,border-radius,transform]"
      >
        <div
          ref={compactRef}
          className="absolute inset-x-0 top-0 z-10 flex h-10 items-center justify-center gap-2 px-4"
        >
          <span className="h-2 w-2 rounded-full bg-kiddy-cherry animate-pulse" />
          <span className="text-xs font-bold tracking-wide text-white">Вопрос</span>
        </div>

        <div ref={expandedRef} className="box-border p-5 sm:p-6" style={{ width: 'min(380px, calc(100vw - 2rem))' }}>
          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2">
            {Math.floor(cue.timeSec / 60)}:{String(cue.timeSec % 60).padStart(2, '0')}
          </p>
          <h3 className="text-white text-base sm:text-lg font-bold leading-snug mb-4">{cue.question}</h3>
          <div className="space-y-2 mb-4">
            {cue.options.map((opt, idx) => {
              const isSel = selected === idx;
              const showCorrect = feedback === 'correct' && idx === cue.correctIndex;
              const showWrong = feedback === 'wrong' && isSel;
              return (
                <button
                  key={`${cue.id}_${idx}`}
                  type="button"
                  data-quiz-opt
                  disabled={feedback === 'correct'}
                  onClick={() => onSelect(idx)}
                  className={`w-full text-left rounded-2xl border px-4 py-3 text-sm font-medium transition-colors ${
                    showCorrect
                      ? 'border-emerald-400/50 bg-emerald-500/15 text-emerald-100'
                      : showWrong
                        ? 'border-red-400/50 bg-red-500/15 text-red-100'
                        : isSel
                          ? 'border-white/40 bg-white/10 text-white'
                          : 'border-white/10 bg-white/[0.03] text-zinc-200 hover:bg-white/[0.06]'
                  }`}
                >
                  <span className="inline-flex items-center gap-2">
                    {showCorrect && <CheckCircle2 size={16} />}
                    {showWrong && <XCircle size={16} />}
                    {opt}
                  </span>
                </button>
              );
            })}
          </div>
          {feedback === 'wrong' && (
            <p className="text-red-300/90 text-xs mb-3">Неверно — попробуй ещё раз.</p>
          )}
          {feedback !== 'correct' ? (
            <button
              type="button"
              disabled={selected === null}
              onClick={onSubmit}
              className="w-full py-3.5 rounded-2xl bg-white text-black font-bold disabled:opacity-40 hover:bg-zinc-200 transition-colors"
            >
              Ответить
            </button>
          ) : (
            <p className="text-emerald-300 text-sm font-semibold text-center flex items-center justify-center gap-2">
              <CheckCircle2 size={16} /> Верно! Продолжаем…
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Плеер + квизы. Оболочка уходит в fullscreen (не сам <video>),
 * иначе оверлей квиза в нативном fullscreen не виден.
 */
export function LessonVideoPlayer({ videoUrl, className = '', quizCues, lessonId }: Props) {
  const cues = normalizeQuizCues(quizCues);
  const [src, setSrc] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [authTick, setAuthTick] = useState(0);
  const [isShellFs, setIsShellFs] = useState(false);
  const loadGen = useRef(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const shellRef = useRef<HTMLDivElement | null>(null);

  const [activeCue, setActiveCue] = useState<LessonQuizCue | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const answeredRef = useRef<Set<string>>(new Set());
  const lastTimeRef = useRef(0);

  useEffect(() => {
    answeredRef.current = new Set();
    lastTimeRef.current = 0;
    setActiveCue(null);
    setSelected(null);
    setFeedback(null);
  }, [lessonId, videoUrl]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'SIGNED_OUT') {
        setAuthTick((n) => n + 1);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  /** Если браузер увёл в fullscreen сам video — переносим fullscreen на оболочку. */
  useEffect(() => {
    const onFsChange = async () => {
      const fs = document.fullscreenElement;
      const video = videoRef.current;
      const shell = shellRef.current;
      setIsShellFs(fs === shell);

      if (fs && video && fs === video && shell) {
        try {
          await document.exitFullscreen();
          await shell.requestFullscreen();
        } catch {
          /* ignore */
        }
      }
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let refreshTimer: ReturnType<typeof setTimeout> | undefined;
    const gen = ++loadGen.current;

    async function load() {
      setLoading(true);
      setError(null);

      if (!isBunnyLessonVideo(videoUrl)) {
        if (!cancelled && gen === loadGen.current) {
          setSrc(videoUrl);
          setLoading(false);
        }
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        if (!cancelled && gen === loadGen.current) {
          setError('Войдите в аккаунт, чтобы смотреть урок');
          setSrc(null);
          setLoading(false);
        }
        return;
      }

      try {
        const { url, expires } = await fetchLessonVideoPlayUrl(videoUrl, token);
        if (cancelled || gen !== loadGen.current) return;
        setSrc(url);
        setLoading(false);

        const ms = Math.max(60_000, expires * 1000 - Date.now() - 5 * 60_000);
        refreshTimer = setTimeout(() => {
          if (!cancelled) void load();
        }, ms);
      } catch (e) {
        if (!cancelled && gen === loadGen.current) {
          setError(e instanceof Error ? e.message : 'Не удалось загрузить видео');
          setSrc(null);
          setLoading(false);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
      if (refreshTimer) clearTimeout(refreshTimer);
    };
  }, [videoUrl, authTick]);

  const exitNativeVideoFullscreen = useCallback(async () => {
    const v = videoRef.current as HTMLVideoElement & {
      webkitDisplayingFullscreen?: boolean;
      webkitExitFullscreen?: () => void;
    };
    if (!v) return;
    try {
      if (document.fullscreenElement === v) {
        await document.exitFullscreen();
      }
    } catch {
      /* ignore */
    }
    if (v.webkitDisplayingFullscreen && typeof v.webkitExitFullscreen === 'function') {
      v.webkitExitFullscreen();
    }
  }, []);

  const toggleShellFullscreen = useCallback(async () => {
    const shell = shellRef.current;
    if (!shell) return;
    try {
      if (document.fullscreenElement === shell) {
        await document.exitFullscreen();
      } else {
        await exitNativeVideoFullscreen();
        await shell.requestFullscreen();
      }
    } catch {
      /* ignore */
    }
  }, [exitNativeVideoFullscreen]);

  const openCue = useCallback(
    async (cue: LessonQuizCue) => {
      const v = videoRef.current;
      if (v) {
        v.pause();
        if (Math.abs(v.currentTime - cue.timeSec) > 0.35) {
          v.currentTime = cue.timeSec;
        }
      }
      // iOS / native video FS — выходим, иначе квиз не виден
      await exitNativeVideoFullscreen();

      // Если уже fullscreen на video — переносим на shell
      const shell = shellRef.current;
      if (shell && document.fullscreenElement && document.fullscreenElement !== shell) {
        try {
          await document.exitFullscreen();
          await shell.requestFullscreen();
        } catch {
          /* ignore */
        }
      }

      setActiveCue(cue);
      setSelected(null);
      setFeedback(null);
    },
    [exitNativeVideoFullscreen],
  );

  const onTimeUpdate = () => {
    const v = videoRef.current;
    if (!v || activeCue) return;
    const t = v.currentTime;
    const prev = lastTimeRef.current;
    lastTimeRef.current = t;
    for (const cue of cues) {
      if (answeredRef.current.has(cue.id)) continue;
      if (prev < cue.timeSec && t >= cue.timeSec) {
        void openCue(cue);
        return;
      }
    }
  };

  const onSeeking = () => {
    const v = videoRef.current;
    if (!v || activeCue) return;
    const t = v.currentTime;
    const blocked = cues.find((c) => !answeredRef.current.has(c.id) && t > c.timeSec + 0.2);
    if (blocked) {
      v.currentTime = blocked.timeSec;
      void openCue(blocked);
    }
  };

  const submitAnswer = () => {
    if (!activeCue || selected === null) return;
    if (selected === activeCue.correctIndex) {
      setFeedback('correct');
      answeredRef.current.add(activeCue.id);
      window.setTimeout(() => {
        setActiveCue(null);
        setSelected(null);
        setFeedback(null);
        void videoRef.current?.play().catch(() => undefined);
      }, 700);
    } else {
      setFeedback('wrong');
    }
  };

  if (error) {
    return (
      <div className={`absolute inset-0 flex flex-col items-center justify-center bg-kiddy-surfaceElevated gap-3 px-6 ${className}`}>
        <MonitorPlay size={40} className="text-zinc-600" />
        <p className="text-kiddy-textMuted text-sm text-center font-medium">{error}</p>
      </div>
    );
  }

  return (
    <div
      ref={shellRef}
      className={`absolute inset-0 bg-black [:fullscreen]:fixed [:fullscreen]:inset-0 [:fullscreen]:z-[9999] ${isShellFs ? 'flex items-center justify-center' : ''}`}
    >
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black z-10">
          <Loader2 className="animate-spin text-kiddy-cherry" size={36} />
        </div>
      )}

      {src && (
        <video
          ref={videoRef}
          key={src}
          src={src}
          controls={!activeCue}
          playsInline
          preload="metadata"
          controlsList="nodownload nofullscreen noremoteplayback"
          disablePictureInPicture
          className={`w-full h-full object-contain bg-black ${className}`}
          onCanPlay={() => setLoading(false)}
          onLoadedMetadata={() => setLoading(false)}
          onTimeUpdate={onTimeUpdate}
          onSeeking={onSeeking}
          onError={(e) => {
            const mediaErr = e.currentTarget.error;
            if (!mediaErr || mediaErr.code === mediaErr.MEDIA_ERR_ABORTED) return;
            setLoading(false);
            const looksMov = /\.mov(\?|$)/i.test(src);
            if (mediaErr.code === mediaErr.MEDIA_ERR_SRC_NOT_SUPPORTED || looksMov) {
              setError(
                looksMov
                  ? 'Формат .mov не поддерживается. Загрузите MP4 (H.264).'
                  : 'Браузер не смог открыть файл. Нужен MP4 (H.264 + AAC).',
              );
              return;
            }
            if (mediaErr.code === mediaErr.MEDIA_ERR_NETWORK) {
              setError('Сеть: не удалось скачать видео. Обновите страницу.');
              return;
            }
            setError('Не удалось воспроизвести видео. Обновите страницу или перезалейте MP4.');
          }}
        />
      )}

      {/* Свой fullscreen — на оболочку, чтобы квиз был внутри FS */}
      <button
        type="button"
        onClick={() => void toggleShellFullscreen()}
        className="absolute bottom-14 right-3 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white border border-white/15 backdrop-blur-md hover:bg-black/80"
        title={isShellFs ? 'Выйти из полного экрана' : 'Полный экран'}
        aria-label={isShellFs ? 'Выйти из полного экрана' : 'Полный экран'}
      >
        {isShellFs ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
      </button>

      {activeCue && (
        <QuizIsland
          cue={activeCue}
          selected={selected}
          feedback={feedback}
          onSelect={(idx) => {
            setSelected(idx);
            setFeedback(null);
          }}
          onSubmit={submitAnswer}
        />
      )}
    </div>
  );
}
