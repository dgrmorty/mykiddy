import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Loader2, MonitorPlay, XCircle } from 'lucide-react';
import { fetchLessonVideoPlayUrl, isBunnyLessonVideo } from '../services/bunnyVideoService';
import { supabase } from '../services/supabase';
import type { LessonQuizCue } from '../types';
import { normalizeQuizCues } from '../utils/quizCues';

type Props = {
  /** bunny:path или прямой URL (не youtube) */
  videoUrl: string;
  className?: string;
  /** Вопросы по таймкодам — пауза до ответа */
  quizCues?: LessonQuizCue[];
  lessonId?: string;
};

/**
 * Свой плеер: для bunny: получает временный CDN URL после логина.
 * quizCues — пауза на секунде и оверлей с вопросом.
 */
export function LessonVideoPlayer({ videoUrl, className = '', quizCues, lessonId }: Props) {
  const cues = normalizeQuizCues(quizCues);
  const [src, setSrc] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [authTick, setAuthTick] = useState(0);
  const loadGen = useRef(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [activeCue, setActiveCue] = useState<LessonQuizCue | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const answeredRef = useRef<Set<string>>(new Set());
  const lastTimeRef = useRef(0);

  // Сброс ответов при смене урока
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

  const openCue = (cue: LessonQuizCue) => {
    const v = videoRef.current;
    if (v) {
      v.pause();
      // чуть отмотать к таймкоду (на случай seek)
      if (Math.abs(v.currentTime - cue.timeSec) > 0.35) {
        v.currentTime = cue.timeSec;
      }
    }
    setActiveCue(cue);
    setSelected(null);
    setFeedback(null);
  };

  const onTimeUpdate = () => {
    const v = videoRef.current;
    if (!v || activeCue) return;
    const t = v.currentTime;
    const prev = lastTimeRef.current;
    lastTimeRef.current = t;
    // Пересекли таймкод вперёд (в т.ч. при ускорении)
    for (const cue of cues) {
      if (answeredRef.current.has(cue.id)) continue;
      if (prev < cue.timeSec && t >= cue.timeSec) {
        openCue(cue);
        return;
      }
    }
  };

  const onSeeking = () => {
    const v = videoRef.current;
    if (!v || activeCue) return;
    const t = v.currentTime;
    // Нельзя перемотать дальше неотвеченного вопроса
    const blocked = cues.find((c) => !answeredRef.current.has(c.id) && t > c.timeSec + 0.2);
    if (blocked) {
      v.currentTime = blocked.timeSec;
      openCue(blocked);
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
      }, 650);
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
    <>
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
          controlsList="nodownload"
          className={`w-full h-full absolute inset-0 bg-black ${className}`}
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

      {activeCue && (
        <div className="absolute inset-0 z-20 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-md p-4 sm:p-8">
          <div className="w-full max-w-lg rounded-[1.75rem] border border-white/10 bg-[#0c0c0c] p-5 sm:p-6 shadow-premium">
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2">
              Вопрос · {Math.floor(activeCue.timeSec / 60)}:{String(activeCue.timeSec % 60).padStart(2, '0')}
            </p>
            <h3 className="text-white text-lg font-bold leading-snug mb-4">{activeCue.question}</h3>
            <div className="space-y-2 mb-4">
              {activeCue.options.map((opt, idx) => {
                const isSel = selected === idx;
                const showCorrect = feedback === 'correct' && idx === activeCue.correctIndex;
                const showWrong = feedback === 'wrong' && isSel;
                return (
                  <button
                    key={`${activeCue.id}_${idx}`}
                    type="button"
                    disabled={feedback === 'correct'}
                    onClick={() => {
                      setSelected(idx);
                      setFeedback(null);
                    }}
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
            {feedback !== 'correct' && (
              <button
                type="button"
                disabled={selected === null}
                onClick={submitAnswer}
                className="w-full py-3.5 rounded-2xl bg-white text-black font-bold disabled:opacity-40 hover:bg-zinc-200 transition-colors"
              >
                Ответить
              </button>
            )}
            {feedback === 'correct' && (
              <p className="text-emerald-300 text-sm font-semibold text-center flex items-center justify-center gap-2">
                <CheckCircle2 size={16} /> Верно! Продолжаем…
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
