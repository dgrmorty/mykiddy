import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, ArrowRight, ArrowLeft } from 'lucide-react';
import {
  getStepsForUser,
  onboardingStorageKey,
  resolveTourTarget,
} from '../../data/onboardingTour';
import { Role } from '../../types';

interface OnboardingTourProps {
  userId: string;
  isGuest: boolean;
  role: Role;
}

type Box = { top: number; left: number; width: number; height: number; radius: number };

const OVERLAY_Z = 10000;
/** Отступ подсветки вокруг кнопки и минимальный зазор до края экрана. */
const PAD = 8;
const EDGE = 6;
const GAP = 18;
const CARD_W = 360;
/** Шапка сжимается анимацией ~280 мс — всё это время следим за кнопкой покадрово. */
const FOLLOW_MS = 700;

function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(max-width: 767px)').matches : false,
  );

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const onChange = () => setIsMobile(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return isMobile;
}

/** Прямоугольник подсветки: повторяет форму кнопки и никогда не выходит за край экрана. */
function measureTarget(el: HTMLElement): Box {
  const r = el.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const top = Math.max(EDGE, r.top - PAD);
  const left = Math.max(EDGE, r.left - PAD);
  const bottom = Math.min(vh - EDGE, r.bottom + PAD);
  const right = Math.min(vw - EDGE, r.right + PAD);
  const height = Math.max(0, bottom - top);
  const width = Math.max(0, right - left);
  const own = parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0;
  return { top, left, width, height, radius: Math.min(own + PAD, height / 2) };
}

export const OnboardingTour: React.FC<OnboardingTourProps> = ({ userId, isGuest, role }) => {
  const [open, setOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [box, setBox] = useState<Box | null>(null);
  const [card, setCard] = useState<{ top: number; left: number; caretX: number; below: boolean } | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const isMobile = useIsMobile();

  const isAdmin = role === Role.ADMIN;
  const steps = useMemo(() => getStepsForUser(isAdmin), [isAdmin]);
  const step = steps[stepIndex];
  const lastStep = stepIndex >= steps.length - 1;

  const finishTour = useCallback(() => {
    try {
      localStorage.setItem(onboardingStorageKey(userId), '1');
    } catch {
      /* ignore */
    }
    setOpen(false);
  }, [userId]);

  const updateGeometry = useCallback(() => {
    if (!open || !step) return;
    const el = resolveTourTarget(step.anchor);
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const cardW = Math.min(CARD_W, vw - 32);
    const cardH = cardRef.current?.offsetHeight ?? 240;

    if (!el) {
      setBox(null);
      setCard({ top: Math.max(24, (vh - cardH) / 2), left: (vw - cardW) / 2, caretX: -1, below: true });
      return;
    }

    const b = measureTarget(el);
    setBox(b);
    if (isMobile) return;

    const centerX = b.left + b.width / 2;
    const left = Math.max(16, Math.min(centerX - cardW / 2, vw - cardW - 16));
    const spaceBelow = vh - (b.top + b.height);
    const below = spaceBelow >= cardH + GAP + 16 || spaceBelow >= b.top;
    const top = below
      ? Math.min(b.top + b.height + GAP, vh - cardH - 16)
      : Math.max(16, b.top - cardH - GAP);
    const caretX = Math.max(24, Math.min(centerX - left, cardW - 24));
    setCard({ top, left, caretX, below });
  }, [open, step, isMobile]);

  useEffect(() => {
    if (isGuest || !userId || userId === 'guest') return;
    if (steps.length === 0) return;
    try {
      if (localStorage.getItem(onboardingStorageKey(userId))) return;
    } catch {
      return;
    }
    const t = window.setTimeout(() => setOpen(true), 1000);
    return () => clearTimeout(t);
  }, [isGuest, userId, steps.length]);

  // На каждом шаге несколько сотен мс следим за кнопкой: шапка и прокрутка ещё анимируются
  useLayoutEffect(() => {
    if (!open || !step) return;
    const el = resolveTourTarget(step.anchor);
    el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });

    let frame = 0;
    const until = performance.now() + FOLLOW_MS;
    const tick = () => {
      updateGeometry();
      if (performance.now() < until) frame = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(frame);
  }, [open, step, updateGeometry]);

  useEffect(() => {
    if (!open) return;
    const onResize = () => updateGeometry();
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onResize, true);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onResize, true);
    };
  }, [open, updateGeometry]);

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    nextRef.current?.focus({ preventScroll: true });
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  const next = useCallback(() => {
    if (lastStep) finishTour();
    else setStepIndex((i) => i + 1);
  }, [lastStep, finishTour]);

  const back = useCallback(() => setStepIndex((i) => Math.max(0, i - 1)), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') finishTour();
      else if (e.key === 'ArrowRight') next();
      else if (e.key === 'ArrowLeft') back();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, finishTour, next, back]);

  if (!open || isGuest || !step || steps.length === 0) return null;

  const sheet = isMobile || !card;
  // Цель внизу (вкладки на телефоне) — карточку ставим сверху, чтобы не закрыть подсветку
  const sheetTop = sheet && !!box && box.top + box.height / 2 > window.innerHeight / 2;
  const cardStyle: React.CSSProperties = sheet
    ? { zIndex: OVERLAY_Z + 3 }
    : {
        zIndex: OVERLAY_Z + 3,
        top: card.top,
        left: card.left,
        width: `min(${CARD_W}px, calc(100vw - 32px))`,
        ['--caret-x' as string]: `${card.caretX}px`,
      };

  const node = (
    <div className="tour" style={{ zIndex: OVERLAY_Z }} role="dialog" aria-modal="true" aria-labelledby="onboarding-title">
      {/* Перехватывает клики по интерфейсу, пока идёт тур */}
      <div className="tour__blocker" style={{ zIndex: OVERLAY_Z }} aria-hidden />

      {box ? (
        <div
          className="tour__spotlight"
          style={{
            zIndex: OVERLAY_Z + 1,
            top: box.top,
            left: box.left,
            width: box.width,
            height: box.height,
            borderRadius: box.radius,
          }}
          aria-hidden
        >
          <span className="tour__pulse" style={{ borderRadius: box.radius }} />
        </div>
      ) : (
        <div className="tour__dim" style={{ zIndex: OVERLAY_Z + 1 }} aria-hidden />
      )}

      <div
        ref={cardRef}
        className={`tour-card ${sheet ? 'tour-card--sheet' : 'tour-card--float'} ${sheetTop ? 'tour-card--sheet-top' : ''} ${
          !sheet && card && card.caretX >= 0 ? (card.below ? 'has-caret-top' : 'has-caret-bottom') : ''
        }`}
        style={cardStyle}
      >
        <div className="flex items-center justify-between gap-3">
          <p className="tour-card__eyebrow">
            Шаг {stepIndex + 1} из {steps.length}
          </p>
          <button type="button" onClick={finishTour} className="tour-card__close" aria-label="Закрыть гид">
            <X size={16} />
          </button>
        </div>

        <div className="tour-card__progress" aria-hidden>
          {steps.map((s, i) => (
            <span key={s.anchor} className={i <= stepIndex ? 'is-done' : ''} />
          ))}
        </div>

        <div key={step.anchor} className="tour-card__content">
          <h2 id="onboarding-title" className="font-display text-xl font-semibold tracking-[-0.02em] text-white">
            {step.title}
          </h2>
          <p className="mt-2 text-[15px] leading-relaxed text-zinc-400">{step.body}</p>
        </div>

        <div className="mt-6 flex items-center gap-2">
          <button
            type="button"
            onClick={finishTour}
            className="mr-auto px-1 text-sm font-semibold text-zinc-400 transition-colors hover:text-white"
          >
            Пропустить
          </button>
          {stepIndex > 0 && (
            <button type="button" onClick={back} className="btn-secondary btn-solid h-10 w-10 shrink-0" aria-label="Назад">
              <ArrowLeft size={16} />
            </button>
          )}
          <button ref={nextRef} type="button" onClick={next} className="btn-cta group h-10 px-5 text-sm">
            {lastStep ? 'Готово' : 'Далее'}
            {!lastStep && (
              <ArrowRight size={16} className="ml-1.5 transition-transform duration-200 group-hover:translate-x-0.5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(node, document.body);
};
