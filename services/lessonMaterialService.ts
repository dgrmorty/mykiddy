/**
 * Upload lesson materials (PDF/PPTX) via server — admin only, service role bypasses storage RLS.
 */
import { getApiUrl } from '../config';

const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

function sanitizeFileName(name: string): string {
  const ext = (name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin';
  const base = name.replace(/\.[^.]+$/, '');
  const safe = base
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80)
    .replace(/^-|-$/g, '') || 'material';
  return `${safe}.${ext}`;
}

export async function uploadLessonMaterial(
  file: File,
  accessToken: string,
): Promise<{ url: string; name: string }> {
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error('Файл слишком большой (макс. 50 MB).');
  }

  const filename = sanitizeFileName(file.name);
  const url = getApiUrl(`api/lesson-material/upload?filename=${encodeURIComponent(filename)}`);

  const data = await new Promise<{ url?: string; name?: string; error?: string }>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`);
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
    xhr.onload = () => {
      try {
        resolve(JSON.parse(xhr.responseText || '{}'));
      } catch {
        reject(new Error('Некорректный ответ сервера'));
      }
    };
    xhr.onerror = () => reject(new Error('Сеть недоступна'));
    xhr.send(file);
  });

  if (!data.url) {
    throw new Error(data.error || 'Не удалось загрузить файл');
  }

  return { url: data.url, name: data.name || file.name };
}

export async function syncAdminProfileRole(accessToken: string): Promise<void> {
  const response = await fetch(getApiUrl('api/admin/sync-profile-role'), {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    console.warn('[Admin] sync-profile-role failed', body.error || response.status);
  }
}
