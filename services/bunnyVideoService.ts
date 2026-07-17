/**
 * Клиент для защищённых видеоуроков (Bunny Storage + CDN token URL).
 * В БД храним: bunny:path/to/file.mp4
 *
 * Загрузка всегда напрямую в Bunny (Railway не проксирует большие тела).
 */

import { getApiUrl } from '../config';

export const BUNNY_VIDEO_PREFIX = 'bunny:';

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

type UploadAuth = {
  storageZone: string;
  storagePassword: string;
  storageHost: string;
  pathPrefix: string;
};

async function fetchUploadAuth(accessToken: string): Promise<UploadAuth> {
  const response = await fetch(getApiUrl('api/lesson-video/upload-auth'), {
    headers: await authHeaders(accessToken),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || 'Нет прав на загрузку видео');
  }
  return data as UploadAuth;
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
 * Загрузка урока напрямую в Bunny Storage (с прогрессом).
 * Перед PUT берём креды с нашего API (только админ).
 */
export async function uploadLessonVideoToBunny(
  file: File,
  accessToken: string,
  onProgress?: (pct: number) => void,
): Promise<string> {
  const auth = await fetchUploadAuth(accessToken);
  const fileName = `${Date.now()}_${sanitizeFileName(file.name)}`;
  const path = `${auth.pathPrefix}${fileName}`;
  const putUrl = `https://${auth.storageHost}/${auth.storageZone}/${path}`;

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', putUrl);
    xhr.setRequestHeader('AccessKey', auth.storagePassword);
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else {
        const detail = (xhr.responseText || '').slice(0, 160);
        reject(new Error(`Ошибка загрузки в Bunny (${xhr.status})${detail ? `: ${detail}` : ''}`));
      }
    };
    xhr.onerror = () => reject(new Error('Сеть: не удалось загрузить видео в Bunny'));
    xhr.onabort = () => reject(new Error('Загрузка отменена'));
    xhr.send(file);
  });

  return toBunnyStoredUrl(path);
}
