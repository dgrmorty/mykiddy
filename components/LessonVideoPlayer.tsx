import { useCallback, useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { CheckCircle2, Loader2, Maximize2, Minimize2, MonitorPlay, Sparkles, XCircle } from 'lucide-react';
import { fetchLessonVideoPlayUrl, isBunnyLessonVideo } from '../services/bunnyVideoService';
import { claimLessonQuizCue, fetchAnsweredQuizCueIds } from '../services/lessonQuizService';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
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
  awardedXp: number;
  onSelect: (idx: number) => void;
  onSubmit: () => void;
};

function quizShellMetrics(root: HTMLElement | null) {
  const shell = root?.parentElement;
  const shellW = shell?.clientWidth || window.innerWidth;
  const shellH = shell?.clientHeight || window.innerHeight;
  const pad = shellW < 420 ? 12 : 20;
  const targetW = Math.min(400, Math.max(260, shellW - pad * 2));
  const maxH = Math.min(shellH - pad * 2, shellH * 0.92, 520);
  return { targetW, maxH, pad, short: shellH < 380 || shellW < 420 };
}

/** Dynamic Island по центру ролика — адаптив под телефон / landscape / desktop. */
function QuizIsland({ cue, selected, feedback, awardedXp, onSelect, onSubmit }: QuizIslandProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const compactRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLDivElement>(null);
  const successRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const root = rootRef.current;
      const card = cardRef.current;
      const compact = compactRef.current;
      const body = bodyRef.current;
      const footer = footerRef.current;
      if (!root || !card || !compact || !body) return;

      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      gsap.killTweensOf([card, compact, body, footer].filter(Boolean));

      const { targetW, maxH, short } = quizShellMetrics(root);

      // Сначала показываем контент скрыто, меряем, потом анимируем.
      // В конце — height:auto, иначе при «Неверно» футер обрезается overflow'ом.
      gsap.set(body, { visibility: 'hidden', opacity: 0 });
      if (footer) gsap.set(footer, { opacity: 0 });
      gsap.set(card, { width: targetW, height: 'auto', maxHeight: maxH, overflow: 'hidden' });

      const contentH = card.scrollHeight;
      const targetH = Math.min(Math.max(contentH, short ? 200 : 240), maxH);

      if (reduced) {
        gsap.set(card, {
          width: targetW,
          height: 'auto',
          maxHeight: maxH,
          borderRadius: short ? 22 : 28,
          opacity: 1,
          scale: 1,
          x: 0,
          y: 0,
        });
        gsap.set(compact, { opacity: 0, visibility: 'hidden' });
        gsap.set(body, { opacity: 1, visibility: 'visible' });
        if (footer) gsap.set(footer, { opacity: 1 });
        return;
      }

      const pillW = short ? 118 : 132;
      gsap.set(card, {
        width: pillW,
        height: 40,
        maxHeight: maxH,
        borderRadius: 22,
        opacity: 1,
        scale: 0.92,
        x: 0,
        y: short ? 8 : 16,
      });
      gsap.set(compact, { opacity: 1, visibility: 'visible' });
      gsap.set(body, { opacity: 0, visibility: 'hidden' });
      if (footer) gsap.set(footer, { opacity: 0 });

      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
      tl.to(card, { scale: 1, y: 0, duration: 0.3 }, 0)
        .to(card, { width: targetW, duration: short ? 0.36 : 0.44 }, 0.06)
        .to(compact, { opacity: 0, duration: 0.1 }, short ? 0.28 : 0.34)
        .set(compact, { visibility: 'hidden' })
        .set(body, { visibility: 'visible' })
        .to(
          card,
          {
            height: targetH,
            borderRadius: short ? 22 : 28,
            duration: short ? 0.4 : 0.48,
            ease: 'power3.inOut',
          },
          short ? 0.3 : 0.36,
        )
        .fromTo(body, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.3 }, short ? 0.42 : 0.5)
        .from(
          body.querySelectorAll('[data-quiz-opt]'),
          { opacity: 0, y: 8, stagger: 0.045, duration: 0.24 },
          short ? 0.48 : 0.56,
        );

      if (footer) {
        tl.fromTo(footer, { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.28 }, short ? 0.52 : 0.62);
      }

      // Важно: дальше высота только через CSS auto — кнопка не уедет под карточку
      tl.add(() => {
        gsap.set(card, { height: 'auto', maxHeight: maxH, clearProps: 'overflow' });
      });
    },
    { dependencies: [cue.id], scope: rootRef },
  );

  useGSAP(
    () => {
      const card = cardRef.current;
      if (!card || feedback !== 'wrong') return;
      gsap.fromTo(
        card,
        { x: -6 },
        {
          x: 6,
          duration: 0.06,
          yoyo: true,
          repeat: 5,
          ease: 'power1.inOut',
          onComplete: () => gsap.set(card, { x: 0 }),
        },
      );
    },
    { dependencies: [feedback], scope: rootRef },
  );

  useGSAP(
    () => {
      const el = successRef.current;
      if (!el || feedback !== 'correct') return;
      gsap.fromTo(
        el,
        { opacity: 0, y: 10, scale: 0.94 },
        { opacity: 1, y: 0, scale: 1, duration: 0.4, ease: 'power3.out' },
      );
      const xp = el.querySelector('[data-xp-badge]');
      if (xp) {
        gsap.fromTo(
          xp,
          { opacity: 0, scale: 0.7, y: 6 },
          { opacity: 1, scale: 1, y: 0, duration: 0.35, delay: 0.1, ease: 'back.out(1.4)' },
        );
      }
    },
    { dependencies: [feedback, awardedXp], scope: rootRef },
  );

  return (
    <div
      ref={rootRef}
      className="absolute inset-0 z-30 flex items-center justify-center p-3 sm:p-5"
      style={{ paddingLeft: 'max(0.75rem, env(safe-area-inset-left))', paddingRight: 'max(0.75rem, env(safe-area-inset-right))' }}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[3px]" />
      <div
        ref={cardRef}
        className="relative z-10 flex w-full max-w-[400px] flex-col overflow-hidden border border-white/12 bg-black/95 shadow-island backdrop-blur-2xl will-change-[width,height,border-radius,transform]"
        style={{ maxHeight: 'min(92%, 520px)' }}
      >
        <div
          ref={compactRef}
          className="pointer-events-none absolute inset-x-0 top-0 z-10 flex h-10 items-center justify-center gap-2 px-4"
        >
          <span className="h-2 w-2 shrink-0 rounded-full bg-kiddy-cherry animate-pulse" />
          <span className="text-xs font-bold tracking-wide text-white">Вопрос</span>
        </div>

        <div
          ref={bodyRef}
          className="custom-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-4 sm:px-5 sm:pt-5"
        >
          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
            {Math.floor(cue.timeSec / 60)}:{String(cue.timeSec % 60).padStart(2, '0')}
          </p>
          <h3 className="mb-3 text-[15px] font-bold leading-snug text-white sm:mb-4 sm:text-lg">
            {cue.question}
          </h3>
          <div className="space-y-2">
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
                  className={`w-full rounded-2xl border px-3.5 py-2.5 text-left text-[13px] font-medium transition-colors sm:px-4 sm:py-3 sm:text-sm ${
                    showCorrect
                      ? 'border-emerald-400/50 bg-emerald-500/15 text-emerald-100'
                      : showWrong
                        ? 'border-red-400/50 bg-red-500/15 text-red-100'
                        : isSel
                          ? 'border-white/40 bg-white/10 text-white'
                          : 'border-white/10 bg-white/[0.03] text-zinc-200 active:bg-white/[0.08] hover:bg-white/[0.06]'
                  }`}
                >
                  <span className="inline-flex items-start gap-2">
                    {showCorrect && <CheckCircle2 size={16} className="mt-0.5 shrink-0" />}
                    {showWrong && <XCircle size={16} className="mt-0.5 shrink-0" />}
                    <span className="min-w-0 break-words">{opt}</span>
                  </span>
                </button>
              );
            })}
          </div>
          {/* Резерв места под ошибку — без скачка и без обрезания футера */}
          <div className="mt-2 min-h-[1.25rem]" aria-live="polite">
            {feedback === 'wrong' && (
              <p className="text-xs text-red-300/90">Неверно — попробуй ещё раз.</p>
            )}
          </div>
        </div>

        <div
          ref={footerRef}
          className="relative z-20 shrink-0 border-t border-white/[0.06] bg-black px-4 py-3 sm:px-5 sm:py-3.5"
        >
          {feedback !== 'correct' ? (
            <button
              type="button"
              disabled={selected === null}
              onClick={onSubmit}
              className="w-full rounded-2xl bg-white py-3 text-sm font-bold text-black transition-colors hover:bg-zinc-200 disabled:opacity-40 sm:py-3.5"
            >
              Ответить
            </button>
          ) : (
            <div ref={successRef} className="flex flex-col items-center gap-2 py-0.5">
              <p className="flex items-center justify-center gap-2 text-center text-sm font-semibold text-emerald-300">
                <CheckCircle2 size={16} className="shrink-0" /> Верно! Продолжаем
              </p>
              {awardedXp > 0 && (
                <span
                  data-xp-badge
                  className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-xs font-bold text-amber-200"
                >
                  <Sparkles size={12} /> +{awardedXp} XP
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function LessonVideoPlayer({ videoUrl, className = '', quizCues, lessonId }: Props) {
  const cues = normalizeQuizCues(quizCues);
  const { refreshUser, isGuest } = useAuth();
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
  const [awardedXp, setAwardedXp] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const answeredRef = useRef<Set<string>>(new Set());
  const firstTryRef = useRef(true);
  const lastTimeRef = useRef(0);
  const [, setAnsweredTick] = useState(0);

  // Загрузить уже отвеченные квизы — больше не показывать
  useEffect(() => {
    answeredRef.current = new Set();
    lastTimeRef.current = 0;
    firstTryRef.current = true;
    setActiveCue(null);
    setSelected(null);
    setFeedback(null);
    setAwardedXp(0);

    if (!lessonId || isGuest) {
      setAnsweredTick((n) => n + 1);
      return;
    }

    let cancelled = false;
    void fetchAnsweredQuizCueIds(lessonId).then((ids) => {
      if (cancelled) return;
      answeredRef.current = new Set(ids);
      setAnsweredTick((n) => n + 1);
    });
    return () => {
      cancelled = true;
    };
  }, [lessonId, videoUrl, isGuest]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'SIGNED_OUT') {
        setAuthTick((n) => n + 1);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

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
      if (document.fullscreenElement === v) await document.exitFullscreen();
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
      if (answeredRef.current.has(cue.id)) return;
      const v = videoRef.current;
      if (v) {
        v.pause();
        if (Math.abs(v.currentTime - cue.timeSec) > 0.35) {
          v.currentTime = cue.timeSec;
        }
      }
      await exitNativeVideoFullscreen();

      const shell = shellRef.current;
      if (shell && document.fullscreenElement && document.fullscreenElement !== shell) {
        try {
          await document.exitFullscreen();
          await shell.requestFullscreen();
        } catch {
          /* ignore */
        }
      }

      firstTryRef.current = true;
      setActiveCue(cue);
      setSelected(null);
      setFeedback(null);
      setAwardedXp(0);
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

  const submitAnswer = async () => {
    if (!activeCue || selected === null || submitting) return;

    if (selected !== activeCue.correctIndex) {
      firstTryRef.current = false;
      setFeedback('wrong');
      return;
    }

    setSubmitting(true);

    let xpGot = 0;
    if (lessonId && !isGuest) {
      try {
        const res = await claimLessonQuizCue(lessonId, activeCue.id, firstTryRef.current);
        xpGot = res.awarded ? res.xp : 0;
      } catch (e) {
        console.warn('[quiz] claim failed', e);
      }
    }

    answeredRef.current.add(activeCue.id);
    setFeedback('correct');
    if (xpGot > 0) {
      setAwardedXp(xpGot);
      void refreshUser?.();
    }
    setSubmitting(false);

    window.setTimeout(() => {
      setActiveCue(null);
      setSelected(null);
      setFeedback(null);
      setAwardedXp(0);
      void videoRef.current?.play().catch(() => undefined);
    }, xpGot > 0 ? 1400 : 900);
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

      <button
        type="button"
        onClick={() => void toggleShellFullscreen()}
        className={`absolute bottom-14 right-3 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white border border-white/15 backdrop-blur-md hover:bg-black/80 ${
          activeCue ? 'pointer-events-none opacity-0' : ''
        }`}
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
          awardedXp={awardedXp}
          onSelect={(idx) => {
            if (feedback === 'correct') return;
            setSelected(idx);
            setFeedback(null);
          }}
          onSubmit={() => void submitAnswer()}
        />
      )}
    </div>
  );
}
