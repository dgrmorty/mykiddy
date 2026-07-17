import { useEffect, useState } from 'react';
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

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      setAuthTick((n) => n + 1);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    let cancelled = false;
    let refreshTimer: ReturnType<typeof setTimeout> | undefined;

    async function load() {
      setLoading(true);
      setError(null);

      if (!isBunnyLessonVideo(videoUrl)) {
        if (!cancelled) {
          setSrc(videoUrl);
          setLoading(false);
        }
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        if (!cancelled) {
          setError('Войдите в аккаунт, чтобы смотреть урок');
          setSrc(null);
          setLoading(false);
        }
        return;
      }

      try {
        const { url, expires } = await fetchLessonVideoPlayUrl(videoUrl, token);
        if (cancelled) return;
        setSrc(url);
        setLoading(false);

        // Обновить ссылку за ~5 мин до истечения
        const ms = Math.max(60_000, expires * 1000 - Date.now() - 5 * 60_000);
        refreshTimer = setTimeout(() => {
          if (!cancelled) void load();
        }, ms);
      } catch (e) {
        if (!cancelled) {
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
          controls
          controlsList="nodownload"
          className={`w-full h-full absolute inset-0 bg-black ${className}`}
          preload="metadata"
          onCanPlay={() => setLoading(false)}
          onLoadedData={() => setLoading(false)}
        >
          <source src={src} type="video/mp4" />
        </video>
      )}
    </>
  );
}
