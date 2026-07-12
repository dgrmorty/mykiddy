import React, { useRef } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(useGSAP);

export type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
  message: string;
  type: ToastType;
  onClose: () => void;
}

const ACCENT = {
  success: {
    icon: 'text-emerald-400',
    ring: 'ring-emerald-400/25',
    bar: 'bg-emerald-400',
    glow: 'bg-emerald-500/20',
  },
  error: {
    icon: 'text-red-400',
    ring: 'ring-red-400/25',
    bar: 'bg-red-400',
    glow: 'bg-red-500/20',
  },
  info: {
    icon: 'text-sky-400',
    ring: 'ring-sky-400/25',
    bar: 'bg-sky-400',
    glow: 'bg-sky-500/20',
  },
} as const;

export const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const closingRef = useRef(false);
  const onCloseRef = useRef(onClose);
  const accent = ACCENT[type];

  onCloseRef.current = onClose;

  const icons = {
    success: <CheckCircle size={18} />,
    error: <AlertCircle size={18} />,
    info: <Info size={18} />,
  };

  useGSAP(
    (_ctx, contextSafe) => {
      const el = rootRef.current;
      if (!el || !contextSafe) return;

      const mm = gsap.matchMedia();
      let dismissTween: gsap.core.Tween | undefined;

      const finishClose = contextSafe(() => {
        if (closingRef.current) return;
        closingRef.current = true;
        dismissTween?.kill();
        gsap.to(el, {
          autoAlpha: 0,
          y: -18,
          scale: 0.92,
          duration: 0.32,
          ease: 'power2.in',
          onComplete: () => onCloseRef.current(),
        });
      });

      mm.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.fromTo(
          el,
          { autoAlpha: 0, y: -22, scale: 0.9 },
          { autoAlpha: 1, y: 0, scale: 1, duration: 0.45, ease: 'power3.out' },
        );
        if (barRef.current) {
          gsap.fromTo(
            barRef.current,
            { scaleX: 1 },
            {
              scaleX: 0,
              duration: 3.6,
              ease: 'none',
              transformOrigin: 'left center',
              onComplete: finishClose,
            },
          );
        } else {
          dismissTween = gsap.delayedCall(3.6, finishClose);
        }
      });

      mm.add('(prefers-reduced-motion: reduce)', () => {
        gsap.set(el, { autoAlpha: 1, y: 0, scale: 1 });
        dismissTween = gsap.delayedCall(3.6, finishClose);
      });

      const onKey = (e: KeyboardEvent) => {
        if (e.key === 'Escape') finishClose();
      };
      window.addEventListener('keydown', onKey);

      return () => {
        window.removeEventListener('keydown', onKey);
        dismissTween?.kill();
        mm.revert();
      };
    },
    { scope: rootRef },
  );

  const handleClose = () => {
    if (closingRef.current || !rootRef.current) return;
    closingRef.current = true;
    gsap.killTweensOf([rootRef.current, barRef.current].filter(Boolean));
    gsap.to(rootRef.current, {
      autoAlpha: 0,
      y: -18,
      scale: 0.92,
      duration: 0.28,
      ease: 'power2.in',
      onComplete: () => onCloseRef.current(),
    });
  };

  return (
    <div
      ref={rootRef}
      role="status"
      className={`relative flex max-w-md items-center gap-3 overflow-hidden rounded-full border border-white/10 bg-black/90 px-3 py-3 pb-3.5 shadow-island backdrop-blur-2xl ring-1 ${accent.ring}`}
    >
      <div className={`pointer-events-none absolute inset-0 ${accent.glow} opacity-40`} />
      <div className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/5 ${accent.icon}`}>
        {icons[type]}
      </div>
      <span className="relative z-10 flex-1 pr-1 text-sm font-semibold tracking-wide text-white">{message}</span>
      <button
        type="button"
        onClick={handleClose}
        aria-label="Закрыть"
        className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-zinc-500 transition-colors hover:bg-white/10 hover:text-white"
      >
        <X size={14} />
      </button>
      <div className="absolute inset-x-3 bottom-1 h-[2px] overflow-hidden rounded-full bg-white/5">
        <div ref={barRef} className={`h-full w-full origin-left ${accent.bar} opacity-80`} />
      </div>
    </div>
  );
};
