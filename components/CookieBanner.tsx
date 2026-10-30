import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Cookie } from 'lucide-react';
import {
  analyticsAvailable,
  loadAnalytics,
  onOpenCookieSettings,
  readConsent,
  saveConsent,
} from '../utils/consent';

/**
 * Баннер согласия на cookie. Необходимые работают всегда; аналитика — только по кнопке «Разрешить».
 * Повторно открывается из политики конфиденциальности и футера.
 */
export const CookieBanner: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [details, setDetails] = useState(false);
  const [analytics, setAnalytics] = useState(false);

  useEffect(() => {
    const saved = readConsent();
    if (saved) {
      setAnalytics(saved.analytics);
      if (saved.analytics) loadAnalytics();
    } else {
      setOpen(true);
    }
    return onOpenCookieSettings(() => {
      setAnalytics(readConsent()?.analytics ?? false);
      setDetails(true);
      setOpen(true);
    });
  }, []);

  if (!open) return null;

  const decide = (allowAnalytics: boolean) => {
    saveConsent(allowAnalytics);
    setOpen(false);
    setDetails(false);
  };

  return (
    <div className="cookie-banner" role="dialog" aria-live="polite" aria-label="Настройки cookie">
      <div className="flex items-start gap-3">
        <span className="feature-tile__icon !h-10 !w-10 !rounded-xl" aria-hidden="true">
          <Cookie size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-sm font-semibold text-white">Мы используем cookie</p>
          <p className="mt-1 text-[13px] leading-relaxed text-zinc-400">
            Необходимые cookie сохраняют вход в аккаунт и настройки.
            {analyticsAvailable && ' Аналитические помогают нам улучшать платформу — их можно отключить.'}{' '}
            <Link to="/privacy" className="font-semibold text-white underline decoration-white/30 underline-offset-2">
              Подробнее
            </Link>
          </p>
        </div>
      </div>

      {details && (
        <div className="mt-4 space-y-2">
          <label className="cookie-banner__row">
            <span>
              <span className="block text-sm font-semibold text-white">Необходимые</span>
              <span className="block text-xs text-zinc-400">Вход, настройки, прогресс видео. Всегда включены.</span>
            </span>
            <input type="checkbox" checked disabled className="cookie-banner__check" />
          </label>
          {analyticsAvailable && (
            <label className="cookie-banner__row cursor-pointer">
              <span>
                <span className="block text-sm font-semibold text-white">Аналитические</span>
                <span className="block text-xs text-zinc-400">Яндекс Метрика: обезличенная статистика посещений.</span>
              </span>
              <input
                type="checkbox"
                checked={analytics}
                onChange={(e) => setAnalytics(e.target.checked)}
                className="cookie-banner__check"
              />
            </label>
          )}
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {analyticsAvailable ? (
          details ? (
            <button type="button" onClick={() => decide(analytics)} className="btn-cta h-10 flex-1 px-5 text-sm">
              Сохранить выбор
            </button>
          ) : (
            <>
              <button type="button" onClick={() => decide(true)} className="btn-cta h-10 flex-1 px-5 text-sm">
                Разрешить все
              </button>
              <button type="button" onClick={() => decide(false)} className="btn-secondary h-10 flex-1 px-5 text-sm">
                Только необходимые
              </button>
              <button
                type="button"
                onClick={() => setDetails(true)}
                className="h-10 px-3 text-sm font-semibold text-zinc-400 transition-colors hover:text-white"
              >
                Настроить
              </button>
            </>
          )
        ) : (
          <button type="button" onClick={() => decide(false)} className="btn-cta h-10 flex-1 px-5 text-sm">
            Понятно
          </button>
        )}
      </div>
    </div>
  );
};
