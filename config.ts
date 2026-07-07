/**
 * API base URL. В продакшене задаётся через VITE_API_URL.
 * Fallback: тот же origin (для деплоя SPA+API вместе) или пустая строка для dev proxy.
 */
const getBase = () => {
  const env = import.meta.env.VITE_API_URL;
  if (env && typeof env === 'string' && env.trim()) return env.trim().replace(/\/$/, '');
  if (typeof window !== 'undefined' && window.location?.origin) return window.location.origin;
  return '';
};

export const API_BASE_URL = getBase();

const normalizeOrigin = (value: string | undefined): string => (value || '').trim().replace(/\/$/, '');

/**
 * База для redirectTo / emailRedirectTo в Supabase.
 * На *.railway.app в проде по умолчанию отдаём публичный домен, но разрешаем
 * оставить Railway основным через VITE_PUBLIC_APP_URL.
 */
export function getAuthRedirectOrigin(): string {
  if (typeof window === 'undefined') return '';
  if (import.meta.env.DEV) return window.location.origin;

  const host = window.location.hostname;
  if (host.endsWith('.railway.app')) {
    const fromEnv = normalizeOrigin(import.meta.env.VITE_PUBLIC_APP_URL);
    return fromEnv || 'https://detivtope.online';
  }
  return window.location.origin;
}

export const getApiUrl = (endpoint: string): string => {
  const base = API_BASE_URL;
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  return base ? `${base}/${cleanEndpoint}` : `/${cleanEndpoint}`;
};
