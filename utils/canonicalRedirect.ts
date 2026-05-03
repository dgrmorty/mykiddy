/**
 * Прод открыт с legacy-хоста *.railway.app → переносим на основной домен,
 * сохраняя path / query / hash (OAuth, magic link, сброс пароля).
 */
export function runCanonicalHostRedirect(): void {
  if (typeof window === 'undefined') return;
  if (import.meta.env.DEV) return;

  const hostname = window.location.hostname;
  if (!hostname.endsWith('.railway.app')) return;

  const fromEnv = (import.meta.env.VITE_PUBLIC_APP_URL || '').trim().replace(/\/$/, '');
  const targetOrigin = fromEnv || 'https://detivtope.online';

  if (window.location.origin === targetOrigin) return;

  const tail = window.location.pathname + window.location.search + window.location.hash;
  window.location.replace(targetOrigin + tail);
}
