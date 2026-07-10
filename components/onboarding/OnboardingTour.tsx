import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronRight, ChevronLeft, Sparkles } from 'lucide-react';
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

const OVERLAY_Z = 10000;

const DIM_CLASS = 'bg-black/80 animate-fade-in';

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

/** Затемнение только вокруг прямоугольника — центр без слоя, без blur (интерфейс остаётся чётким). */
function DimmingCutout({
  rect,
  zIndex,
}: {
  rect: { top: number; left: number; width: number; height: number };
  zIndex: number;
}) {
  const { top, left, width, height } = rect;
  const vw = typeof window !== 'undefined' ? window.innerWidth : 0;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 0;
  const right = left + width;
  const bottom = top + height;

  return (
    <>
      <div className={`fixed left-0 right-0 top-0 ${DIM_CLASS}`} style={{ height: Math.max(0, top), zIndex }} aria-hidden />
      <div
        className={`fixed left-0 right-0 ${DIM_CLASS}`}
        style={{ top: bottom, height: Math.max(0, vh - bottom), zIndex }}
        aria-hidden
      />
      <div
        className={`fixed ${DIM_CLASS}`}
        style={{ top, left: 0, width: Math.max(0, left), height, zIndex }}
        aria-hidden
      />
      <div
        className={`fixed ${DIM_CLASS}`}
        style={{ top, left: right, width: Math.max(0, vw - right), height, zIndex }}
        aria-hidden
      />
    </>
  );
}

export const OnboardingTour: React.FC<OnboardingTourProps> = ({ userId, isGuest, role }) => {
  const [open, setOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number }>({
    top: 120,
    left: 24,
  });
  const [useMobileSheet, setUseMobileSheet] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
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
    if (!open) return;
    const s = steps[stepIndex];
    if (!s) {
      setRect(null);
      setUseMobileSheet(isMobile);
      return;
    }
    const el = resolveTourTarget(s.anchor);
    if (!el) {
      setRect(null);
      setUseMobileSheet(isMobile);
      const tw = Math.min(340, window.innerWidth - 32);
      setTooltipPos({
        top: Math.max(80, window.innerHeight / 2 - 100),
        left: Math.max(16, (window.innerWidth - tw) / 2),
      });
      return;
    }
    const r = el.getBoundingClientRect();
    const pad = isMobile ? 8 : 10;
    setRect({
      top: r.top - pad,
      left: r.left - pad,
      width: r.width + pad * 2,
      height: r.height + pad * 2,
    });

    if (isMobile) {
      setUseMobileSheet(true);
      return;
    }

    setUseMobileSheet(false);
    const tw = Math.min(340, window.innerWidth - 32);
    let left = r.left + r.width / 2 - tw / 2;
    left = Math.max(16, Math.min(left, window.innerWidth - tw - 16));

    const tooltipH = tooltipRef.current?.offsetHeight ?? 260;
    const spaceBelow = window.innerHeight - r.bottom;
    const spaceAbove = r.top;
    let top: number;
    if (spaceBelow >= tooltipH + 24 || spaceBelow >= spaceAbove) {
      top = Math.min(r.bottom + 16, window.innerHeight - tooltipH - 16);
    } else {
      top = Math.max(16, r.top - tooltipH - 16);
    }
    setTooltipPos({ top, left });
  }, [open, stepIndex, steps, isMobile]);

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

  useLayoutEffect(() => {
    if (!open || !step) return;

    const el = resolveTourTarget(step.anchor);
    if (el) {
      el.scrollIntoView({
        block: isMobile ? 'nearest' : 'center',
        behavior: 'smooth',
      });
    }

    const id = window.requestAnimationFrame(() => updateGeometry());
    const id2 = window.setTimeout(() => updateGeometry(), 280);
    return () => {
      cancelAnimationFrame(id);
      clearTimeout(id2);
    };
  }, [open, stepIndex, step, updateGeometry, isMobile]);

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
    if (!open || !useMobileSheet) return;
    const id = window.requestAnimationFrame(() => updateGeometry());
    return () => cancelAnimationFrame(id);
  }, [open, useMobileSheet, stepIndex, updateGeometry]);

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') finishTour();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, finishTour]);

  const next = () => {
    if (lastStep) finishTour();
    else setStepIndex((i) => i + 1);
  };

  const back = () => setStepIndex((i) => Math.max(0, i - 1));

  if (!open || isGuest || !step || steps.length === 0) return null;

  const node = (
    <div className="fixed inset-0" style={{ zIndex: OVERLAY_Z }} role="dialog" aria-modal="true" aria-labelledby="onboarding-title">
      {rect ? (
        <DimmingCutout rect={rect} zIndex={OVERLAY_Z} />
      ) : (
        <div className={`fixed inset-0 ${DIM_CLASS}`} style={{ zIndex: OVERLAY_Z }} aria-hidden />
      )}
      {rect && (
        <div
          className="pointer-events-none absolute rounded-[2rem] border border-white/20 transition-all duration-300 ease-out"
          style={{
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
            zIndex: OVERLAY_Z + 1,
            boxShadow: '0 0 0 1px rgba(255,255,255,0.1), 0 0 32px rgba(255,255,255,0.1)',
          }}
        />
      )}
      <div
        ref={tooltipRef}
        className={`max-w-[340px] rounded-[2rem] border border-white/10 bg-black/90 backdrop-blur-2xl p-5 shadow-island animate-fade-in sm:p-6 ${
          useMobileSheet
            ? 'fixed left-4 right-4 bottom-[calc(5.75rem+env(safe-area-inset-bottom,0px))] w-auto max-w-none'
            : 'absolute'
        }`}
        style={
          useMobileSheet
            ? { zIndex: OVERLAY_Z + 3, animationDuration: '0.4s' }
            : {
                top: tooltipPos.top,
                left: tooltipPos.left,
                width: 'min(340px, calc(100vw - 32px))',
                zIndex: OVERLAY_Z + 3,
                animationDuration: '0.4s',
              }
        }
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 text-white">
            <Sparkles size={18} />
          </div>
          <button
            type="button"
            onClick={finishTour}
            className="rounded-full p-1.5 text-zinc-500 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Закрыть гайд"
          >
            <X size={18} />
          </button>
        </div>
        <h2 id="onboarding-title" className="font-display text-xl font-bold text-white tracking-tight">
          {step.title}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-zinc-400">{step.body}</p>
        <div className="mt-5 flex flex-col gap-3 sm:mt-6 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-600">
            {stepIndex + 1} / {steps.length}
          </span>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-end">
            <button
              type="button"
              onClick={finishTour}
              className="rounded-xl px-3 py-2.5 text-xs font-bold text-zinc-500 transition-colors hover:text-white sm:py-2"
            >
              Пропустить
            </button>
            {stepIndex > 0 ? (
              <button
                type="button"
                onClick={back}
                className="flex items-center justify-center gap-1 rounded-xl bg-white/5 px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-white/10 sm:py-2"
              >
                <ChevronLeft size={16} /> Назад
              </button>
            ) : (
              <span className="hidden sm:block" aria-hidden />
            )}
            <button
              type="button"
              onClick={next}
              className={`flex items-center justify-center gap-1 rounded-xl bg-white px-5 py-2.5 text-xs font-bold text-black shadow-premium transition-all hover:bg-zinc-200 sm:py-2 ${
                stepIndex > 0 ? 'col-span-2 sm:col-span-1' : 'col-span-1'
              }`}
            >
              {lastStep ? 'Готово' : 'Далее'}
              {!lastStep && <ChevronRight size={16} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(node, document.body);
};
