import React, { useRef } from 'react';
import { Lock } from 'lucide-react';
import { Card } from './ui/Card';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(useGSAP);

export const AccessGate: React.FC<{ title?: string; message?: string }> = ({
  title = 'Доступ ограничен',
  message = 'Для доступа к материалам нужно подтверждение учётной записи администратором. Ожидайте завершения проверки.',
}) => {
  const rootRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.from('.ag-card', {
          autoAlpha: 0,
          y: 28,
          scale: 0.96,
          duration: 0.85,
          ease: 'elastic.out(1, 0.7)',
        });
        gsap.from('.ag-icon', {
          autoAlpha: 0,
          scale: 0.7,
          duration: 0.7,
          delay: 0.12,
          ease: 'back.out(1.6)',
        });
        gsap.from('.ag-copy', {
          autoAlpha: 0,
          y: 12,
          duration: 0.55,
          stagger: 0.08,
          delay: 0.2,
          ease: 'power3.out',
        });
        gsap.to('.ag-glow', {
          opacity: 0.45,
          scale: 1.12,
          duration: 2.4,
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
    <div ref={rootRef} className="flex min-h-[60vh] items-center justify-center p-6">
      <Card className="ag-card relative max-w-md w-full overflow-hidden px-8 py-12 text-center" glow>
        <div className="ag-glow pointer-events-none absolute left-1/2 top-8 h-28 w-28 -translate-x-1/2 rounded-full bg-kiddy-cherry/25 blur-3xl" />
        <div className="ag-icon relative mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border border-kiddy-cherry/25 bg-kiddy-cherry/15 shadow-[0_0_24px_rgba(230,0,43,0.2)]">
          <Lock className="text-kiddy-cherry" size={28} strokeWidth={1.75} />
        </div>
        <h2 className="ag-copy mb-3 font-display text-xl font-semibold tracking-tight text-white">{title}</h2>
        <p className="ag-copy mb-8 text-body-sm leading-relaxed text-kiddy-textSecondary">{message}</p>
        <p className="ag-copy text-caption text-kiddy-textMuted">Дети В ТОПЕ · верификация</p>
      </Card>
    </div>
  );
};
