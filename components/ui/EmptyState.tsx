import React, { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(useGSAP);

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon,
  action,
  className = '',
}) => {
  const rootRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
        tl.from('.es-glow', { autoAlpha: 0, scale: 0.6, duration: 0.8 })
          .from('.es-icon', { autoAlpha: 0, y: 18, scale: 0.86, duration: 0.7, ease: 'elastic.out(1, 0.65)' }, '-=0.45')
          .from('.es-copy', { autoAlpha: 0, y: 14, duration: 0.55, stagger: 0.08 }, '-=0.35')
          .from('.es-action', { autoAlpha: 0, y: 10, duration: 0.45 }, '-=0.25');

        gsap.to('.es-icon', {
          y: -6,
          duration: 2.8,
          ease: 'sine.inOut',
          yoyo: true,
          repeat: -1,
          delay: 0.9,
        });
        gsap.to('.es-glow', {
          opacity: 0.55,
          scale: 1.08,
          duration: 3.2,
          ease: 'sine.inOut',
          yoyo: true,
          repeat: -1,
          delay: 0.9,
        });
      });
      return () => mm.revert();
    },
    { scope: rootRef },
  );

  return (
    <div
      ref={rootRef}
      className={`relative flex flex-col items-center justify-center overflow-hidden rounded-[2rem] border border-white/[0.08] bg-gradient-to-b from-white/[0.04] to-transparent px-8 py-14 text-center shadow-premium ${className}`}
    >
      <div className="es-glow pointer-events-none absolute left-1/2 top-10 h-40 w-40 -translate-x-1/2 rounded-full bg-kiddy-cherry/15 blur-3xl" />

      <div className="es-icon relative z-10 mb-7 flex h-24 w-24 items-center justify-center rounded-[1.75rem] border border-white/10 bg-black/70 text-zinc-400 shadow-island">
        <div className="absolute inset-0 rounded-[1.75rem] bg-gradient-to-br from-white/[0.06] to-transparent" />
        <div className="relative z-10">
          {icon || (
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
              <line x1="12" y1="22.08" x2="12" y2="12" />
            </svg>
          )}
        </div>
      </div>

      <h3 className="es-copy relative z-10 mb-2 font-display text-lg font-semibold tracking-tight text-white">{title}</h3>
      <p className="es-copy relative z-10 max-w-sm text-sm leading-relaxed text-zinc-400">{description}</p>
      {action ? <div className="es-action relative z-10 mt-7">{action}</div> : null}
    </div>
  );
};
