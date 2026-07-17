import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

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

/**
 * Modal без GSAP — CSS transitions.
 * GSAP elastic.out / getTweens давали Maximum call stack на /admin при upload.
 */
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
  const [mounted, setMounted] = useState(isOpen);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setMounted(true);
      const id = window.requestAnimationFrame(() => setVisible(true));
      return () => window.cancelAnimationFrame(id);
    }
    setVisible(false);
    const t = window.setTimeout(() => {
      setMounted(false);
      onClosed?.();
    }, 220);
    return () => window.clearTimeout(t);
  }, [isOpen, onClosed]);

  useEffect(() => {
    if (!mounted) return;
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
  }, [mounted]);

  if (!mounted) return null;

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
        className={`fixed inset-0 cursor-pointer bg-black/75 backdrop-blur-2xl transition-opacity duration-200 ${
          visible ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
        aria-hidden
      />
      <div
        className={`relative z-10 flex w-full flex-col overflow-hidden transition-all duration-200 ease-out ${maxWidth}
          ${transparentContainer
            ? ''
            : mobileCentered
              ? 'rounded-[2rem] border border-white/[0.08] bg-[#0a0a0a] shadow-premium'
              : 'rounded-t-[2rem] border border-white/[0.08] bg-[#0a0a0a] shadow-premium md:rounded-[2.25rem]'}
          ${panelClassName}
          ${visible ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-4 scale-[0.98] opacity-0'}
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
