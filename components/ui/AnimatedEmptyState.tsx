import React, { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { BrandLoaderSvg } from './BrandLoaderSvg';

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
          y: 12,
          duration: 0.55,
          ease: 'power3.out',
        });
        gsap.from('.aes-copy', {
          autoAlpha: 0,
          y: 8,
          duration: 0.45,
          delay: 0.12,
          ease: 'power3.out',
        });
      });
      return () => mm.revert();
    },
    { scope: rootRef },
  );

  return (
    <div ref={rootRef} className="flex flex-col items-center justify-center p-8 text-center">
      <div className="aes-shell relative mb-6 flex h-[72px] w-[72px] items-center justify-center rounded-[1.35rem] border border-white/[0.06] bg-black/60 shadow-island">
        <BrandLoaderSvg size={52} />
      </div>
      <p className="aes-copy text-sm font-medium tracking-wide text-kiddy-textSecondary">{message}</p>
    </div>
  );
};
