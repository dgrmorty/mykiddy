import React, { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(useGSAP);

/** Premium loading / waiting state (used while data fetches). */
export const AnimatedEmptyState: React.FC<{ message?: string }> = ({
  message = 'Нет данных',
}) => {
  const rootRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.from('.aes-shell', {
          autoAlpha: 0,
          y: 16,
          scale: 0.94,
          duration: 0.7,
          ease: 'elastic.out(1, 0.7)',
        });
        gsap.from('.aes-copy', {
          autoAlpha: 0,
          y: 10,
          duration: 0.5,
          delay: 0.15,
          ease: 'power3.out',
        });

        gsap.to('.aes-ring', {
          rotation: 360,
          duration: 1.4,
          ease: 'none',
          repeat: -1,
        });
        gsap.to('.aes-core', {
          scale: 1.18,
          opacity: 0.95,
          duration: 1.1,
          ease: 'sine.inOut',
          yoyo: true,
          repeat: -1,
        });
        gsap.to('.aes-glow', {
          opacity: 0.55,
          scale: 1.15,
          duration: 1.6,
          ease: 'sine.inOut',
          yoyo: true,
          repeat: -1,
        });
      });
      return () => mm.revert();
    },
    { scope: rootRef },
  );

  return (
    <div ref={rootRef} className="flex flex-col items-center justify-center p-8 text-center">
      <div className="aes-shell relative mb-6">
        <div className="aes-glow absolute -inset-5 rounded-3xl bg-kiddy-cherry/15 blur-2xl" />
        <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-white/[0.08] bg-black/80 shadow-island">
          <div className="aes-ring absolute inset-2 rounded-xl border-2 border-transparent border-t-kiddy-cherry/90 border-r-white/15" />
          <div className="aes-core h-2.5 w-2.5 rounded-full bg-kiddy-cherry shadow-[0_0_16px_rgba(230,0,43,0.65)]" />
        </div>
      </div>
      <p className="aes-copy text-sm font-semibold tracking-wide text-kiddy-textSecondary">{message}</p>
    </div>
  );
};
