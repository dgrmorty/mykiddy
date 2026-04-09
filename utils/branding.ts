/**
 * Значения брендинга из таблицы settings (админка).
 * Логотип — только по HTTPS-URL из БД (локальные файлы не используем).
 */

const MAX_LOGO_URL_LEN = 2048;
const MAX_SCHOOL_NAME_LEN = 120;

export function sanitizeLogoUrl(raw: string | null | undefined): string | null {
  if (!raw || typeof raw !== 'string') return null;
  const t = raw.trim();
  if (!t || t.length > MAX_LOGO_URL_LEN) return null;
  const probe = t.slice(0, 24).toLowerCase();
  if (
    probe.startsWith('javascript:') ||
    probe.startsWith('data:') ||
    probe.startsWith('vbscript:') ||
    probe.startsWith('file:')
  ) {
    return null;
  }
  try {
    const u = new URL(t);
    if (u.protocol === 'https:') return t;
    const devLocalHttp =
      import.meta.env.DEV &&
      u.protocol === 'http:' &&
      (u.hostname === 'localhost' || u.hostname === '127.0.0.1');
    if (devLocalHttp) return t;
    return null;
  } catch {
    return null;
  }
}

export function sanitizeSchoolName(raw: string | null | undefined, fallback: string): string {
  if (!raw || typeof raw !== 'string') return fallback;
  const t = raw.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, MAX_SCHOOL_NAME_LEN);
  return t || fallback;
}
