/**
 * Клиент для защищённых видеоуроков (Bunny Storage + CDN token URL).
 * В БД храним: bunny:path/to/file.mp4
 *
 * Загрузка только через наш API — ключ Bunny не попадает в браузер.
 */

import { getApiUrl } from '../config';

export const BUNNY_VIDEO_PREFIX = 'bunny:';
const MAX_UPLOAD_BYTES = 95 * 1024 * 1024;

export function isBunnyLessonVideo(url?: string | null): boolean {
  return !!url && url.startsWith(BUNNY_VIDEO_PREFIX);
}

export function bunnyPathFromStored(url: string): string {
  return url.slice(BUNNY_VIDEO_PREFIX.length).replace(/^\/+/, '');
}

export function toBunnyStoredUrl(path: string): string {
  return `${BUNNY_VIDEO_PREFIX}${path.replace(/^\/+/, '')}`;
}

async function authHeaders(accessToken: string): Promise<HeadersInit> {
  return { Authorization: `Bearer ${accessToken}` };
}

/** Получить временный CDN URL для воспроизведения (нужна сессия). */
export async function fetchLessonVideoPlayUrl(
  pathOrBunnyUrl: string,
  accessToken: string,
): Promise<{ url: string; expires: number }> {
  const path = pathOrBunnyUrl.startsWith(BUNNY_VIDEO_PREFIX)
    ? bunnyPathFromStored(pathOrBunnyUrl)
    : pathOrBunnyUrl.replace(/^\/+/, '');

  const response = await fetch(
    getApiUrl(`api/lesson-video/play?path=${encodeURIComponent(path)}`),
    { headers: await authHeaders(accessToken) },
  );
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || 'Не удалось получить видео');
  }
  return { url: data.url as string, expires: data.expires as number };
}

function sanitizeFileName(name: string): string {
  const base = name.replace(/\.[^.]+$/, '');
  const ext = (name.split('.').pop() || 'mp4').toLowerCase().replace(/[^a-z0-9]/g, '') || 'mp4';
  const safe = base
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60)
    .replace(/^-|-$/g, '') || 'lesson';
  return `${safe}.${ext}`;
}

/**
 * Загрузка урока через сервер (с прогрессом). Ключ Bunny на клиент не уходит.
 */
export async function uploadLessonVideoToBunny(
  file: File,
  accessToken: string,
  onProgress?: (pct: number) => void,
): Promise<string> {
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error('Файл слишком большой для загрузки через сервер (макс. 95 MB).');
  }

  const filename = sanitizeFileName(file.name);
  const url = getApiUrl(`api/lesson-video/upload?filename=${encodeURIComponent(filename)}`);

  const data = await new Promise<{ path?: string; video_url?: string; error?: string }>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`);
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };
    xhr.onload = () => {
      const parsed = (() => {
        try {
          return JSON.parse(xhr.responseText || '{}');
        } catch {
          return {};
        }
      })();
      if (xhr.status >= 200 && xhr.status < 300) resolve(parsed);
      else reject(new Error(parsed.error || `Ошибка загрузки (${xhr.status})`));
    };
    xhr.onerror = () => reject(new Error('Сеть: не удалось загрузить видео'));
    xhr.onabort = () => reject(new Error('Загрузка отменена'));
    xhr.send(file);
  });

  const stored = data.video_url || (data.path ? toBunnyStoredUrl(data.path) : '');
  if (!stored) throw new Error('Сервер не вернул путь видео');
  return stored;
}
