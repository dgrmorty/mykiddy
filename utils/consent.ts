/**
 * Согласие на cookie и подключение аналитики.
 * Необходимые cookie/хранилище работают всегда; аналитика (Яндекс Метрика) грузится
 * только после явного согласия и только если в сборке задан VITE_YM_ID.
 */

export type CookieConsent = { analytics: boolean; decidedAt: string; version: number };

const STORAGE_KEY = 'kiddy_cookie_consent';
const CONSENT_VERSION = 1;
const OPEN_EVENT = 'kiddy:open-cookie-settings';

const YM_ID = String(import.meta.env.VITE_YM_ID || '').trim();
export const analyticsAvailable = /^\d+$/.test(YM_ID);

export function readConsent(): CookieConsent | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CookieConsent;
    return parsed.version === CONSENT_VERSION ? parsed : null;
  } catch {
    return null;
  }
}

export function saveConsent(analytics: boolean): CookieConsent {
  const consent: CookieConsent = { analytics, decidedAt: new Date().toISOString(), version: CONSENT_VERSION };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(consent));
  } catch {
    /* приватный режим — баннер просто покажется снова */
  }
  if (analytics) loadAnalytics();
  return consent;
}

export function openCookieSettings() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

export function onOpenCookieSettings(handler: () => void) {
  window.addEventListener(OPEN_EVENT, handler);
  return () => window.removeEventListener(OPEN_EVENT, handler);
}

type YmFn = ((...args: unknown[]) => void) & { a?: unknown[][]; l?: number };
let analyticsLoaded = false;

export function loadAnalytics() {
  if (!analyticsAvailable || analyticsLoaded || typeof window === 'undefined') return;
  analyticsLoaded = true;
  const w = window as unknown as { ym?: YmFn };
  const ym: YmFn = w.ym || (function (...args: unknown[]) {
    (ym.a = ym.a || []).push(args);
  } as YmFn);
  ym.l = Date.now();
  w.ym = ym;
  const script = document.createElement('script');
  script.async = true;
  script.src = 'https://mc.yandex.ru/metrika/tag.js';
  document.head.appendChild(script);
  ym(Number(YM_ID), 'init', {
    clickmap: true,
    trackLinks: true,
    accurateTrackBounce: true,
    defer: true,
  });
  trackPageView(window.location.pathname + window.location.search);
}

/** SPA: отправляем просмотр страницы при смене маршрута. */
export function trackPageView(url: string) {
  if (!analyticsLoaded) return;
  const ym = (window as unknown as { ym?: YmFn }).ym;
  ym?.(Number(YM_ID), 'hit', url, { title: document.title });
}
