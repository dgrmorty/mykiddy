import React, { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(useGSAP);

export const KnowledgeField: React.FC = () => {
  const rootRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const mm = gsap.matchMedia();

    mm.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.to('.knowledge-field__orb--cherry', {
        x: 80,
        y: -34,
        scale: 1.08,
        duration: 9,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      });
      gsap.to('.knowledge-field__orb--cyber', {
        x: -70,
        y: 48,
        scale: 1.12,
        duration: 11,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      });
      gsap.to('.knowledge-field__orb--cyan', {
        x: 46,
        y: -54,
        scale: 1.06,
        duration: 13,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      });
    });

    return () => mm.revert();
  }, { scope: rootRef });

  return (
    <div ref={rootRef} className="knowledge-field" aria-hidden>
      <div className="knowledge-field__orb knowledge-field__orb--cherry" />
      <div className="knowledge-field__orb knowledge-field__orb--cyber" />
      <div className="knowledge-field__orb knowledge-field__orb--cyan" />
    </div>
  );
};
