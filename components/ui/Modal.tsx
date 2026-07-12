import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(useGSAP);

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: string;
  transparentContainer?: boolean;
  onClosed?: () => void;
  maxPanelHeight?: string;
  panelClassName?: string;
  mobileCentered?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  children,
  maxWidth = 'max-w-md',
  transparentContainer = false,
  onClosed,
  maxPanelHeight = 'min(92dvh, calc(100dvh - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px) - 1.5rem))',
  panelClassName = '',
  mobileCentered = false,
}) => {
  // Important: start open when isOpen is already true (e.g. AuthModal mounts with isOpen).
  // Otherwise children never mount on the first paint and parent GSAP (opacity-0 forms) never runs.
  const [phase, setPhase] = useState<'closed' | 'open' | 'closing'>(() => (isOpen ? 'open' : 'closed'));
  const backdropRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const onClosedRef = useRef(onClosed);
  const openAnimatedRef = useRef(false);

  useEffect(() => {
    onClosedRef.current = onClosed;
  }, [onClosed]);

  useEffect(() => {
    if (isOpen) {
      if (phase === 'closed' || phase === 'closing') {
        openAnimatedRef.current = false;
        setPhase('open');
      }
    } else if (phase === 'open') {
      setPhase('closing');
    }
  }, [isOpen, phase]);

  useEffect(() => {
    if (phase === 'closed') return;
    const scrollY = window.scrollY;
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';
    document.body.style.overflow = 'hidden';
    return () => {
      const top = document.body.style.top;
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.overflow = '';
      if (top) window.scrollTo(0, parseInt(top || '0', 10) * -1);
    };
  }, [phase]);

  useGSAP(
    () => {
      if (phase === 'closed' || !backdropRef.current || !panelRef.current) return;

      const backdrop = backdropRef.current;
      const panel = panelRef.current;
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const isMobileSheet = !mobileCentered && window.matchMedia('(max-width: 767px)').matches;

      if (phase === 'open') {
        if (openAnimatedRef.current) return;
        openAnimatedRef.current = true;

        if (reduce) {
          gsap.set([backdrop, panel], { autoAlpha: 1, y: 0, scale: 1 });
          return;
        }
        gsap.fromTo(backdrop, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.35, ease: 'power2.out' });
        if (isMobileSheet) {
          gsap.fromTo(
            panel,
            { autoAlpha: 0.7, y: 52 },
            { autoAlpha: 1, y: 0, duration: 0.55, ease: 'power3.out' },
          );
        } else {
          gsap.fromTo(
            panel,
            { autoAlpha: 0, y: 18, scale: 0.96 },
            { autoAlpha: 1, y: 0, scale: 1, duration: 0.55, ease: 'elastic.out(1, 0.72)' },
          );
        }
        return;
      }

      if (phase === 'closing') {
        openAnimatedRef.current = false;
        const finish = () => {
          setPhase('closed');
          onClosedRef.current?.();
        };
        if (reduce) {
          finish();
          return;
        }
        const tl = gsap.timeline({ onComplete: finish });
        tl.to(backdrop, { autoAlpha: 0, duration: 0.28, ease: 'power2.in' }, 0);
        if (isMobileSheet) {
          tl.to(panel, { autoAlpha: 0, y: 36, duration: 0.3, ease: 'power2.in' }, 0);
        } else {
          tl.to(panel, { autoAlpha: 0, y: 12, scale: 0.97, duration: 0.28, ease: 'power2.in' }, 0);
        }
      }
    },
    { dependencies: [phase, mobileCentered] },
  );

  if (phase === 'closed') return null;

  const modalTree = (
    <div
      className={`fixed inset-0 z-[200] flex justify-center p-0 ${
        mobileCentered ? 'items-center px-4 py-4' : 'items-end md:items-center md:p-5'
      }`}
      style={{
        paddingTop: mobileCentered
          ? 'max(1rem, env(safe-area-inset-top, 0px))'
          : 'max(0.5rem, env(safe-area-inset-top, 0px))',
        paddingBottom: mobileCentered
          ? 'max(1rem, env(safe-area-inset-bottom, 0px))'
          : 'max(0px, env(safe-area-inset-bottom, 0px))',
      }}
    >
      <div
        ref={backdropRef}
        className="fixed inset-0 cursor-pointer bg-black/75 backdrop-blur-2xl"
        onClick={onClose}
        aria-hidden
      />
      <div
        ref={panelRef}
        className={`relative z-10 flex w-full flex-col overflow-hidden ${maxWidth}
          ${transparentContainer
            ? ''
            : mobileCentered
              ? 'rounded-[2rem] border border-white/[0.08] bg-[#0a0a0a] shadow-premium'
              : 'rounded-t-[2rem] border border-white/[0.08] bg-[#0a0a0a] shadow-premium md:rounded-[2.25rem]'}
          ${panelClassName}
        `}
        style={{ maxHeight: maxPanelHeight }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto overflow-x-hidden pb-safe md:pb-0">
          {!mobileCentered && (
            <div className="flex w-full justify-center pb-1 pt-3 md:hidden">
              <div className="h-1.5 w-12 rounded-full bg-white/20" />
            </div>
          )}
          {children}
        </div>
      </div>
    </div>
  );

  if (typeof document !== 'undefined') {
    return createPortal(modalTree, document.body);
  }
  return modalTree;
};
