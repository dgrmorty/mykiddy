import { useEffect, useState } from 'react';

/** Hysteresis so the island doesn't flicker around the threshold. */
export function useScrolledCompact(enterAt = 28, exitAt = 10) {
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    let ticking = false;

    const read = () => {
      const y = window.scrollY || document.documentElement.scrollTop || 0;
      setCompact((prev) => (prev ? y > exitAt : y > enterAt));
      ticking = false;
    };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(read);
    };

    read();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [enterAt, exitAt]);

  return compact;
}
