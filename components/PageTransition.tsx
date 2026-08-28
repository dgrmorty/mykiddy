import React, { useRef, useLayoutEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import gsap from 'gsap';

export const PageTransition: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const [displayChildren, setDisplayChildren] = useState(children);
  const containerRef = useRef<HTMLDivElement>(null);
  const prevPathRef = useRef(location.pathname);
  const tweenRef = useRef<gsap.core.Timeline | null>(null);

  useLayoutEffect(() => {
    if (prevPathRef.current === location.pathname) {
      setDisplayChildren(children);
      return;
    }

    const el = containerRef.current;
    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    prevPathRef.current = location.pathname;
    tweenRef.current?.kill();
    tweenRef.current = null;

    if (!el || reduce) {
      if (el) gsap.set(el, { autoAlpha: 1, y: 0, clearProps: 'transform' });
      setDisplayChildren(children);
      el?.scrollTo({ top: 0 });
      return;
    }

    const tl = gsap.timeline({
      onComplete: () => {
        tweenRef.current = null;
        el.scrollTo({ top: 0 });
      },
    });
    tweenRef.current = tl;

    tl.to(el, {
      autoAlpha: 0,
      duration: 0.1,
      ease: 'power3.out',
      onComplete: () => setDisplayChildren(children),
    }).to(el, {
      autoAlpha: 1,
      duration: 0.18,
      ease: 'power3.out',
    });

    return () => {
      tl.kill();
      tweenRef.current = null;
      // Fast nav / unmount must never leave the shell invisible.
      gsap.set(el, { autoAlpha: 1, y: 0, clearProps: 'transform' });
    };
  }, [location.pathname, children]);

  return (
    <div ref={containerRef} className="flex min-h-0 flex-1 flex-col will-change-[opacity,transform]">
      {displayChildren}
    </div>
  );
};
