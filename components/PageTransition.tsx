import React, { useRef, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

export const PageTransition: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const [displayChildren, setDisplayChildren] = useState(children);
  const [transitioning, setTransitioning] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const prevPathRef = useRef(location.pathname);

  useEffect(() => {
    if (prevPathRef.current === location.pathname) {
      setDisplayChildren(children);
      return;
    }
    prevPathRef.current = location.pathname;
    setTransitioning(true);

    const timer = setTimeout(() => {
      setDisplayChildren(children);
      setTransitioning(false);
      containerRef.current?.scrollTo({ top: 0 });
    }, 120);

    return () => clearTimeout(timer);
  }, [location.pathname, children]);

  return (
    <div
      ref={containerRef}
      className="flex min-h-0 flex-1 flex-col transition-all duration-200 ease-entrance"
      style={{
        opacity: 1,
        transform: transitioning ? 'translateY(6px)' : 'translateY(0)',
        filter: transitioning ? 'blur(1px)' : 'blur(0)',
      }}
    >
      {displayChildren}
    </div>
  );
};
