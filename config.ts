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

export const getApiUrl = (endpoint: string): string => {
  const base = API_BASE_URL;
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  return base ? `${base}/${cleanEndpoint}` : `/${cleanEndpoint}`;
};
