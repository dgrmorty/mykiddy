/** Локальный таймкод урока: пережить смену вкладки и перезагрузку signed URL. */

const PREFIX = 'mykiddy_lesson_video_pos_v1_';
const MIN_SAVE_SEC = 3;
const END_GAP_SEC = 8;
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

export function lessonVideoProgressKey(lessonId?: string, videoUrl?: string): string | null {
  const id = (lessonId || '').trim();
  if (id) return id;
  const url = (videoUrl || '').trim();
  return url || null;
}

function storageKey(progressKey: string): string {
  return `${PREFIX}${encodeURIComponent(progressKey).slice(0, 180)}`;
}

export function readLessonVideoPos(progressKey: string | null, duration?: number): number | null {
  if (!progressKey || typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(storageKey(progressKey));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { t?: unknown; at?: unknown };
    const t = Number(parsed.t);
    const at = Number(parsed.at);
    if (!Number.isFinite(t) || t < MIN_SAVE_SEC) return null;
    if (Number.isFinite(at) && Date.now() - at > MAX_AGE_MS) {
      localStorage.removeItem(storageKey(progressKey));
      return null;
    }
    if (typeof duration === 'number' && duration > 0 && t >= duration - END_GAP_SEC) return null;
    return t;
  } catch {
    return null;
  }
}

export function writeLessonVideoPos(progressKey: string | null, time: number, duration?: number): void {
  if (!progressKey || typeof localStorage === 'undefined') return;
  if (!Number.isFinite(time) || time < MIN_SAVE_SEC) {
    clearLessonVideoPos(progressKey);
    return;
  }
  if (typeof duration === 'number' && duration > 0 && time >= duration - END_GAP_SEC) {
    clearLessonVideoPos(progressKey);
    return;
  }
  try {
    localStorage.setItem(
      storageKey(progressKey),
      JSON.stringify({ t: Math.round(time * 10) / 10, at: Date.now() }),
    );
  } catch {
    /* quota / private mode */
  }
}

export function clearLessonVideoPos(progressKey: string | null): void {
  if (!progressKey || typeof localStorage === 'undefined') return;
  try {
    localStorage.removeItem(storageKey(progressKey));
  } catch {
    /* ignore */
  }
}
