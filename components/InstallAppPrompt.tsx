import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { Share, PlusSquare, MoreVertical, Check, Compass } from 'lucide-react';

/**
 * Предложение добавить сайт на главный экран телефона.
 * Android/Chrome — системное окно установки (beforeinstallprompt), иначе пошаговая инструкция.
 * iOS — инструкция через «Поделиться», у Safari нет программной установки.
 */

type Platform = 'ios' | 'android' | 'in-app';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const SNOOZE_KEY = 'kiddy_install_prompt_until';
const INSTALLED_KEY = 'kiddy_install_prompt_installed';
const SNOOZE_DAYS = 14;
const FIRST_DELAY_MS = 6000;
const RETRY_MS = 3000;
const EXIT_MS = 260;

function detectPlatform(): Platform | null {
  if (typeof window === 'undefined') return null;
  const ua = navigator.userAgent;
  const standalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  const native = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.();
  if (standalone || native) return null;

  const isIOS = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/.test(ua);
  if (!isIOS && !isAndroid) return null;
  if (/FBAN|FBAV|Instagram|Telegram|Line\/|VKClient|MicroMessenger/i.test(ua)) return 'in-app';
  return isIOS ? 'ios' : 'android';
}

function isSnoozed(): boolean {
  try {
    if (localStorage.getItem(INSTALLED_KEY)) return true;
    const until = Number(localStorage.getItem(SNOOZE_KEY) || 0);
    return until > Date.now();
  } catch {
    return true;
  }
}

/** Не перекрываем онбординг, cookie-баннер и открытые модалки. */
function screenIsBusy(): boolean {
  const b = document.body.style;
  return (
    !!document.querySelector('.tour, .cookie-banner') ||
    b.overflow === 'hidden' ||
    b.position === 'fixed'
  );
}

export const InstallAppPrompt: React.FC = () => {
  const { pathname } = useLocation();
  const [platform] = useState<Platform | null>(() => detectPlatform());
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const deferredRef = useRef<BeforeInstallPromptEvent | null>(null);
  const [canPrompt, setCanPrompt] = useState(false);

  useEffect(() => {
    const onBefore = (e: Event) => {
      e.preventDefault();
      deferredRef.current = e as BeforeInstallPromptEvent;
      setCanPrompt(true);
    };
    const onInstalled = () => {
      try {
        localStorage.setItem(INSTALLED_KEY, '1');
      } catch {
        /* ignore */
      }
      setOpen(false);
    };
    window.addEventListener('beforeinstallprompt', onBefore);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBefore);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  useEffect(() => {
    if (!platform || isSnoozed() || pathname.startsWith('/admin')) return;
    let timer = 0;
    const attempt = () => {
      if (screenIsBusy()) {
        timer = window.setTimeout(attempt, RETRY_MS);
        return;
      }
      setOpen(true);
    };
    timer = window.setTimeout(attempt, FIRST_DELAY_MS);
    return () => clearTimeout(timer);
    // показываем один раз за визит — маршрут нужен только для первичной проверки
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [platform]);

  const close = useCallback((snooze: boolean) => {
    if (snooze) {
      try {
        localStorage.setItem(SNOOZE_KEY, String(Date.now() + SNOOZE_DAYS * 86400000));
      } catch {
        /* ignore */
      }
    }
    setClosing(true);
    window.setTimeout(() => {
      setOpen(false);
      setClosing(false);
    }, EXIT_MS);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close(true);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, close]);

  const install = async () => {
    const ev = deferredRef.current;
    if (!ev) return;
    await ev.prompt();
    const { outcome } = await ev.userChoice;
    deferredRef.current = null;
    setCanPrompt(false);
    close(outcome !== 'accepted');
  };

  if (!open || !platform) return null;

  const steps: { icon: React.ReactNode; text: React.ReactNode }[] =
    platform === 'ios'
      ? [
          { icon: <Share size={18} />, text: <>Нажми <b>«Поделиться»</b> в панели браузера</> },
          { icon: <PlusSquare size={18} />, text: <>Выбери <b>«На экран „Домой“»</b></> },
          { icon: <Check size={18} />, text: <>Нажми <b>«Добавить»</b> — готово</> },
        ]
      : platform === 'android'
        ? [
            { icon: <MoreVertical size={18} />, text: <>Открой <b>меню браузера</b> справа вверху</> },
            { icon: <PlusSquare size={18} />, text: <>Выбери <b>«Добавить на гл. экран»</b> или <b>«Установить»</b></> },
            { icon: <Check size={18} />, text: <>Подтверди — иконка появится на экране</> },
          ]
        : [
            { icon: <Compass size={18} />, text: <>Открой сайт в <b>Safari</b> или <b>Chrome</b> — через меню <b>⋯</b></> },
            { icon: <Share size={18} />, text: <>Нажми <b>«Поделиться»</b> или меню <b>⋮</b></> },
            { icon: <PlusSquare size={18} />, text: <>Выбери <b>«На экран „Домой“»</b></> },
          ];

  const node = (
    <div className={`install-sheet ${closing ? 'is-closing' : ''}`} role="dialog" aria-modal="true" aria-labelledby="install-title">
      <button type="button" className="install-sheet__backdrop" aria-label="Закрыть" onClick={() => close(true)} />
      <div className="install-sheet__panel">
        <span className="install-sheet__grabber" aria-hidden />

        {/* Анимация: иконка школы прилетает в пустую ячейку на мини-экране телефона */}
        <div className="install-phone" aria-hidden>
          <div className="install-phone__screen">
            {Array.from({ length: 8 }).map((_, i) =>
              i === 5 ? (
                <span key={i} className="install-phone__slot">
                  <img src="/apple-touch-icon.png" alt="" className="install-phone__icon" />
                </span>
              ) : (
                <span key={i} className="install-phone__app" style={{ animationDelay: `${i * 40}ms` }} />
              ),
            )}
          </div>
        </div>

        <h2 id="install-title" className="mt-6 text-center font-display text-[22px] font-semibold leading-tight tracking-[-0.02em] text-white">
          Дети В ТОПЕ —<br />на главный экран
        </h2>
        <p className="mx-auto mt-2 max-w-[19rem] text-center text-[15px] leading-relaxed text-zinc-400">
          Открывай уроки в одно касание, как обычное приложение. Без App Store и загрузок.
        </p>

        {platform === 'android' && canPrompt ? (
          <button type="button" onClick={() => void install()} className="btn-cta mt-6 h-[52px] w-full text-[15px]">
            Установить
          </button>
        ) : (
          <ol className="install-steps mt-6">
            {steps.map((s, i) => (
              <li key={i} style={{ animationDelay: `${260 + i * 70}ms` }}>
                <span className="install-steps__num">{i + 1}</span>
                <span className="min-w-0 flex-1">{s.text}</span>
                <span className="install-steps__icon">{s.icon}</span>
              </li>
            ))}
          </ol>
        )}

        <button
          type="button"
          onClick={() => close(true)}
          className="mt-3 h-11 w-full text-sm font-semibold text-zinc-400 transition-colors hover:text-white"
        >
          {platform === 'android' && canPrompt ? 'Не сейчас' : 'Понятно'}
        </button>
      </div>
    </div>
  );

  return createPortal(node, document.body);
};
