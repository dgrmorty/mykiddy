import { useEffect, useRef, useState } from 'react';
import { Loader2, MonitorPlay } from 'lucide-react';
import { fetchLessonVideoPlayUrl, isBunnyLessonVideo } from '../services/bunnyVideoService';
import { supabase } from '../services/supabase';

type Props = {
  /** bunny:path или прямой URL (не youtube) */
  videoUrl: string;
  className?: string;
};

/**
 * Свой плеер: для bunny: получает временный CDN URL после логина.
 */
export function LessonVideoPlayer({ videoUrl, className = '' }: Props) {
  const [src, setSrc] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [authTick, setAuthTick] = useState(0);
  const loadGen = useRef(0);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      // INITIAL_SESSION при маунте иначе убивает <video> abort'ом → ложный «Нужен MP4»
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
          key={src}
          src={src}
          controls
          playsInline
          preload="metadata"
          controlsList="nodownload"
          className={`w-full h-full absolute inset-0 bg-black ${className}`}
          onCanPlay={() => setLoading(false)}
          onLoadedMetadata={() => setLoading(false)}
          onError={(e) => {
            const mediaErr = e.currentTarget.error;
            // Abort при смене src/размонтировании — не ошибка формата
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
    </>
  );
}
