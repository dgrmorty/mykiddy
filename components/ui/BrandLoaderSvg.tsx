import React, { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(useGSAP);

const FRAME_PATH =
  'M 18 10 H 46 Q 54 10 54 18 V 46 Q 54 54 46 54 H 18 Q 10 54 10 46 V 18 Q 10 10 18 10 Z';

const CHERRY_PATH = 'M 32 23 A 9 9 0 1 1 31.99 23 Z';

const STEM_PATH = 'M 32 23 C 33 17 34.5 13 36 10';

interface BrandLoaderSvgProps {
  size?: number;
  className?: string;
}

/** Premium brand loader: island frame + cherry mark drawn with SVG strokes. */
export const BrandLoaderSvg: React.FC<BrandLoaderSvgProps> = ({ size = 64, className = '' }) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const root = rootRef.current;
      if (!root) return;

      const frame = root.querySelector<SVGPathElement>('.bl-frame');
      const stem = root.querySelector<SVGPathElement>('.bl-stem');
      const cherry = root.querySelector<SVGPathElement>('.bl-cherry');
      const fill = root.querySelector<SVGCircleElement>('.bl-fill');
      if (!frame || !stem || !cherry || !fill) return;

      const frameLen = frame.getTotalLength();
      const stemLen = stem.getTotalLength();
      const cherryLen = cherry.getTotalLength();

      const mm = gsap.matchMedia();

      mm.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.set(frame, { strokeDasharray: frameLen, strokeDashoffset: frameLen });
        gsap.set(stem, { strokeDasharray: stemLen, strokeDashoffset: stemLen });
        gsap.set(cherry, { strokeDasharray: cherryLen, strokeDashoffset: cherryLen });
        gsap.set(fill, { autoAlpha: 0, scale: 0.92, transformOrigin: '32px 32px' });
        gsap.set(glowRef.current, { autoAlpha: 0.25, scale: 0.95 });

        const tl = gsap.timeline({ repeat: -1, repeatDelay: 0.45, defaults: { ease: 'power2.inOut' } });

        tl.to(frame, { strokeDashoffset: 0, duration: 1.05, ease: 'power1.inOut' })
          .to(stem, { strokeDashoffset: 0, duration: 0.32, ease: 'power2.out' }, '-=0.15')
          .to(cherry, { strokeDashoffset: 0, duration: 0.72, ease: 'power2.inOut' }, '-=0.08')
          .to(fill, { autoAlpha: 0.35, scale: 1, duration: 0.35, ease: 'power2.out' }, '-=0.25')
          .to(
            glowRef.current,
            { autoAlpha: 0.45, scale: 1.06, duration: 1.1, ease: 'sine.inOut', yoyo: true, repeat: 1 },
            '-=0.5',
          )
          .to([frame, stem, cherry], { autoAlpha: 0.35, duration: 0.28, ease: 'power1.in' }, '+=0.15')
          .set(frame, { strokeDashoffset: frameLen, autoAlpha: 1 })
          .set(stem, { strokeDashoffset: stemLen, autoAlpha: 1 })
          .set(cherry, { strokeDashoffset: cherryLen, autoAlpha: 1 })
          .set(fill, { autoAlpha: 0, scale: 0.92 });
      });

      mm.add('(prefers-reduced-motion: reduce)', () => {
        gsap.set([frame, stem, cherry], { strokeDashoffset: 0, autoAlpha: 1 });
        gsap.set(fill, { autoAlpha: 0.25, scale: 1 });
        gsap.set(glowRef.current, { autoAlpha: 0.3, scale: 1 });
      });

      return () => mm.revert();
    },
    { scope: rootRef },
  );

  return (
    <div ref={rootRef} className={`relative ${className}`} style={{ width: size, height: size }}>
      <div
        ref={glowRef}
        className="pointer-events-none absolute inset-0 rounded-[1.25rem] bg-kiddy-cherry/25 blur-2xl"
        aria-hidden
      />
      <svg
        viewBox="0 0 64 64"
        width={size}
        height={size}
        className="relative z-10"
        aria-hidden
        fill="none"
      >
        <circle className="bl-fill" cx="32" cy="32" r="9" fill="#e6002b" />
        <path
          className="bl-frame"
          d={FRAME_PATH}
          stroke="rgba(255,255,255,0.22)"
          strokeWidth="1.25"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          className="bl-stem"
          d={STEM_PATH}
          stroke="rgba(255,255,255,0.45)"
          strokeWidth="1.35"
          strokeLinecap="round"
        />
        <path
          className="bl-cherry"
          d={CHERRY_PATH}
          stroke="#e6002b"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
};
