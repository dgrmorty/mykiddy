import React, { useEffect, useRef, useState } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

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

/** Toast без GSAP — CSS only (GSAP elastic/getTweens ронял админку при upload). */
export const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => {
  const [visible, setVisible] = useState(false);
  const closingRef = useRef(false);
  const accent = ACCENT[type];

  const icons = {
    success: <CheckCircle size={18} />,
    error: <AlertCircle size={18} />,
    info: <Info size={18} />,
  };

  const finishClose = () => {
    if (closingRef.current) return;
    closingRef.current = true;
    setVisible(false);
    window.setTimeout(() => onClose(), 220);
  };

  useEffect(() => {
    const enter = window.requestAnimationFrame(() => setVisible(true));
    const auto = window.setTimeout(finishClose, 3600);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') finishClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.cancelAnimationFrame(enter);
      window.clearTimeout(auto);
      window.removeEventListener('keydown', onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      role="status"
      className={`relative flex max-w-md items-center gap-3 overflow-hidden rounded-full border border-white/10 bg-black/90 px-3 py-3 pb-3.5 shadow-island backdrop-blur-2xl ring-1 transition-all duration-200 ease-out ${accent.ring} ${
        visible ? 'translate-y-0 scale-100 opacity-100' : '-translate-y-3 scale-95 opacity-0'
      }`}
    >
      <div className={`pointer-events-none absolute inset-0 ${accent.glow} opacity-40`} />
      <div className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/5 ${accent.icon}`}>
        {icons[type]}
      </div>
      <span className="relative z-10 flex-1 pr-1 text-sm font-semibold tracking-wide text-white">{message}</span>
      <button
        type="button"
        onClick={finishClose}
        aria-label="Закрыть"
        className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-zinc-500 transition-colors hover:bg-white/10 hover:text-white"
      >
        <X size={14} />
      </button>
      <div className="absolute inset-x-3 bottom-1 h-[2px] overflow-hidden rounded-full bg-white/5">
        <div
          className={`h-full w-full origin-left ${accent.bar} opacity-80`}
          style={{ animation: 'toast-bar 3.6s linear forwards' }}
        />
      </div>
      <style>{`@keyframes toast-bar { from { transform: scaleX(1); } to { transform: scaleX(0); } }`}</style>
    </div>
  );
};
