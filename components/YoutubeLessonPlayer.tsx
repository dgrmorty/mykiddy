import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  clearLessonVideoPos,
  lessonVideoProgressKey,
  readLessonVideoPos,
  writeLessonVideoPos,
} from '../utils/lessonVideoProgress';

type Props = {
  videoId: string;
  videoUrl: string;
  lessonId?: string;
  className?: string;
  onReady?: () => void;
};

function youtubeOriginOk(origin: string): boolean {
  try {
    const host = new URL(origin).hostname.replace(/^www\./, '');
    return host === 'youtube.com' || host === 'youtube-nocookie.com';
  } catch {
    return false;
  }
}

function parseYoutubePayload(raw: unknown): Record<string, unknown> | null {
  try {
    const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!data || typeof data !== 'object') return null;
    return data as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function YoutubeLessonPlayer({ videoId, videoUrl, lessonId, className = '', onReady }: Props) {
  const progressKey = lessonVideoProgressKey(lessonId, videoUrl);
  const progressKeyRef = useRef(progressKey);
  progressKeyRef.current = progressKey;
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const lastSaveAtRef = useRef(0);

  const [startSec] = useState(() => {
    const stored = readLessonVideoPos(progressKey);
    return stored != null ? Math.floor(stored) : 0;
  });
  const lastTimeRef = useRef(startSec);

  const src = useMemo(() => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const params = new URLSearchParams({
      autoplay: '0',
      rel: '0',
      modestbranding: '1',
      playsinline: '1',
      enablejsapi: '1',
    });
    if (origin) params.set('origin', origin);
    if (startSec >= 3) params.set('start', String(startSec));
    return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}?${params.toString()}`;
  }, [videoId, startSec]);

  const save = useCallback((force = false) => {
    const t = lastTimeRef.current;
    if (!Number.isFinite(t) || t < 3) return;
    const now = Date.now();
    if (!force && now - lastSaveAtRef.current < 3000) return;
    lastSaveAtRef.current = now;
    writeLessonVideoPos(progressKeyRef.current, t);
  }, []);

  const callPlayer = useCallback((func: string, args: unknown[] = []) => {
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    win.postMessage(JSON.stringify({ event: 'command', func, args }), '*');
  }, []);

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (typeof e.origin !== 'string' || !youtubeOriginOk(e.origin)) return;
      const data = parseYoutubePayload(e.data);
      if (!data) return;
      const info = data.info;
      if (info && typeof info === 'object' && info !== null && 'currentTime' in info) {
        const t = Number((info as { currentTime: unknown }).currentTime);
        if (Number.isFinite(t) && t >= 0) {
          lastTimeRef.current = t;
          save(false);
        }
      }
      if (data.event === 'onStateChange') {
        const state = typeof info === 'number' ? info : Number(data.info);
        if (state === 0) {
          clearLessonVideoPos(progressKeyRef.current);
          lastTimeRef.current = 0;
        } else if (state === 2) {
          save(true);
        }
      }
    };

    const onHide = () => save(true);
    const onVis = () => {
      if (document.visibilityState === 'hidden') onHide();
    };
    window.addEventListener('message', onMessage);
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('pagehide', onHide);
    window.addEventListener('beforeunload', onHide);

    const poll = window.setInterval(() => {
      callPlayer('getCurrentTime');
      save(false);
    }, 2500);

    return () => {
      save(true);
      window.removeEventListener('message', onMessage);
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('pagehide', onHide);
      window.removeEventListener('beforeunload', onHide);
      window.clearInterval(poll);
    };
  }, [callPlayer, save]);

  return (
    <iframe
      ref={iframeRef}
      src={src}
      title="Lesson Video"
      className={`absolute inset-0 h-full w-full border-0 ${className}`}
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowFullScreen
      onLoad={() => {
        onReady?.();
        const win = iframeRef.current?.contentWindow;
        if (!win) return;
        win.postMessage(JSON.stringify({ event: 'listening', id: videoId }), '*');
        callPlayer('addEventListener', ['onStateChange']);
      }}
    />
  );
}
