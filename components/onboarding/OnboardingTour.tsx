import React, { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
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
      return;
    }
    const el = resolveTourTarget(s.anchor);
    if (!el) {
      setRect(null);
      const tw = Math.min(340, window.innerWidth - 32);
      setTooltipPos({
        top: Math.max(80, window.innerHeight / 2 - 100),
        left: Math.max(16, (window.innerWidth - tw) / 2),
      });
      return;
    }
    const r = el.getBoundingClientRect();
    const pad = 10;
    setRect({
      top: r.top - pad,
      left: r.left - pad,
      width: r.width + pad * 2,
      height: r.height + pad * 2,
    });

    const tw = Math.min(340, window.innerWidth - 32);
    let left = r.left + r.width / 2 - tw / 2;
    left = Math.max(16, Math.min(left, window.innerWidth - tw - 16));

    const spaceBelow = window.innerHeight - r.bottom;
    const spaceAbove = r.top;
    const tooltipH = 220;
    let top: number;
    if (spaceBelow >= tooltipH + 24 || spaceBelow >= spaceAbove) {
      top = Math.min(r.bottom + 16, window.innerHeight - tooltipH - 16);
    } else {
      top = Math.max(16, r.top - tooltipH - 16);
    }
    setTooltipPos({ top, left });
  }, [open, stepIndex, steps]);

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
      el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }

    const id = window.requestAnimationFrame(() => updateGeometry());
    return () => cancelAnimationFrame(id);
  }, [open, stepIndex, step, updateGeometry]);

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
          className="pointer-events-none absolute rounded-2xl border-2 border-kiddy-cherry transition-all duration-300 ease-out"
          style={{
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
            zIndex: OVERLAY_Z + 1,
            animation: 'onboarding-pulse-ring 2.2s ease-in-out infinite',
            boxShadow: '0 0 0 4px rgba(230,0,43,0.25), 0 0 48px rgba(230,0,43,0.35)',
          }}
        />
      )}
      <div
        className="absolute max-w-[340px] rounded-2xl border border-white/[0.12] bg-kiddy-surfaceElevated/95 p-5 shadow-2xl shadow-black/60 animate-fade-in"
        style={{
          top: tooltipPos.top,
          left: tooltipPos.left,
          width: 'min(340px, calc(100vw - 32px))',
          zIndex: OVERLAY_Z + 3,
          animationDuration: '0.4s',
        }}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 text-kiddy-cherry">
            <Sparkles size={18} />
            <span className="text-[10px] font-bold uppercase tracking-[0.25em]">Знакомство</span>
          </div>
          <button
            type="button"
            onClick={finishTour}
            className="rounded-lg p-1.5 text-kiddy-textMuted transition-colors hover:bg-white/[0.06] hover:text-white"
            aria-label="Закрыть гайд"
          >
            <X size={18} />
          </button>
        </div>
        <h2 id="onboarding-title" className="font-display text-xl font-bold italic text-white">
          {step.title}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-kiddy-textMuted">{step.body}</p>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.06] pt-4">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-600">
            {stepIndex + 1} / {steps.length}
          </span>
          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={finishTour}
              className="rounded-xl px-3 py-2 text-xs font-bold text-kiddy-textMuted transition-colors hover:text-white"
            >
              Пропустить
            </button>
            {stepIndex > 0 && (
              <button
                type="button"
                onClick={back}
                className="flex items-center gap-1 rounded-xl border border-white/[0.1] px-3 py-2 text-xs font-bold text-white transition-colors hover:border-white/20"
              >
                <ChevronLeft size={16} /> Назад
              </button>
            )}
            <button
              type="button"
              onClick={next}
              className="flex items-center gap-1 rounded-xl bg-kiddy-cherry px-4 py-2 text-xs font-bold text-white shadow-lg shadow-kiddy-cherry/25 transition-all hover:bg-kiddy-cherryHover"
            >
              {lastStep ? 'Готово' : 'Далее'}
              {!lastStep && <ChevronRight size={16} />}
            </button>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes onboarding-pulse-ring {
          0%, 100% { box-shadow: 0 0 0 4px rgba(230,0,43,0.2), 0 0 36px rgba(230,0,43,0.28); }
          50% { box-shadow: 0 0 0 6px rgba(230,0,43,0.35), 0 0 52px rgba(230,0,43,0.45); }
        }
      `}</style>
    </div>
  );

  return createPortal(node, document.body);
};
