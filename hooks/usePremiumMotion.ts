import { RefObject, useEffect } from 'react';

const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Появление блоков при прокрутке: элементам с [data-reveal] внутри root добавляется .is-revealed,
 * когда они входят в экран. Задержка — через атрибут data-reveal-delay (мс).
 */
export function useRevealOnScroll(root: RefObject<HTMLElement>) {
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    // без deps: витрина подгружается асинхронно, новые блоки подхватываем после каждого рендера
    const targets = Array.from(el.querySelectorAll<HTMLElement>('[data-reveal]:not(.is-revealed)'));
    if (!targets.length) return;
    if (reducedMotion() || !('IntersectionObserver' in window)) {
      targets.forEach((t) => t.classList.add('is-revealed'));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const t = entry.target as HTMLElement;
          const delay = Number(t.dataset.revealDelay || 0);
          t.style.transitionDelay = `${delay}ms`;
          t.classList.add('is-revealed');
          io.unobserve(t);
        });
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.12 },
    );
    targets.forEach((t) => io.observe(t));
    return () => io.disconnect();
  });
}

/**
 * Свет за курсором: пишет координаты указателя в --mx/--my элементов с [data-spotlight],
 * а для hero — смещение светового пятна (--px/--py, от -1 до 1).
 */
export function usePointerLight(root: RefObject<HTMLElement>) {
  useEffect(() => {
    const el = root.current;
    if (!el || reducedMotion() || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    let frame = 0;
    let last: PointerEvent | null = null;

    const apply = () => {
      frame = 0;
      if (!last) return;
      const { clientX, clientY } = last;
      el.querySelectorAll<HTMLElement>('[data-spotlight]').forEach((card) => {
        const r = card.getBoundingClientRect();
        card.style.setProperty('--mx', `${clientX - r.left}px`);
        card.style.setProperty('--my', `${clientY - r.top}px`);
      });
      const hero = el.querySelector<HTMLElement>('[data-parallax]');
      if (hero) {
        const r = hero.getBoundingClientRect();
        hero.style.setProperty('--px', (((clientX - r.left) / r.width) * 2 - 1).toFixed(3));
        hero.style.setProperty('--py', (((clientY - r.top) / r.height) * 2 - 1).toFixed(3));
      }
    };

    const onMove = (e: PointerEvent) => {
      last = e;
      if (!frame) frame = requestAnimationFrame(apply);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [root]);
}
