import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';

const EXIT_DURATION_MS = 350;

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: string;
  transparentContainer?: boolean;
  onClosed?: () => void;
  /** Max height of the panel (inline style). Taller = more viewport, keep small bottom margin. */
  maxPanelHeight?: string;
  /** Extra classes on the panel (shadow, ring). */
  panelClassName?: string;
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
}) => {
  const [isExiting, setIsExiting] = useState(false);
  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (isOpen) wasOpenRef.current = true;
    else if (wasOpenRef.current) {
      wasOpenRef.current = false;
      setIsExiting(true);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isExiting) return;
    const t = setTimeout(() => {
      setIsExiting(false);
      onClosed?.();
    }, EXIT_DURATION_MS);
    return () => clearTimeout(t);
  }, [isExiting, onClosed]);

  useEffect(() => {
    if (isOpen || isExiting) {
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';
    } else {
      const scrollY = document.body.style.top;
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.overflow = '';
      if (scrollY) window.scrollTo(0, parseInt(scrollY || '0') * -1);
    }
    return () => {
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.overflow = '';
    };
  }, [isOpen, isExiting]);

  const visible = isOpen || isExiting;
  if (!visible) return null;

  const modalTree = (
    <div
      className="fixed inset-0 z-[200] flex items-end md:items-center justify-center p-0 md:p-5"
      style={{
        paddingTop: 'max(0.5rem, env(safe-area-inset-top, 0px))',
        paddingBottom: 'max(0px, env(safe-area-inset-bottom, 0px))',
      }}
    >
      <div
        className={`fixed inset-0 bg-black/75 backdrop-blur-2xl cursor-pointer transition-all duration-400 ease-out ${isExiting ? 'opacity-0' : 'opacity-100'}`}
        onClick={onClose}
        aria-hidden
      />
      <div
        className={`relative z-10 flex w-full flex-col overflow-hidden ${maxWidth}
          transition-all duration-400 ease-[cubic-bezier(0.16,1,0.3,1)]
          ${isExiting
            ? 'opacity-0 translate-y-full md:translate-y-0 md:scale-[0.98]'
            : 'opacity-100 translate-y-0 md:scale-100 animate-slide-up md:animate-scale-in'}
          ${transparentContainer ? '' : 'rounded-t-[2rem] md:rounded-[2.25rem] bg-[#0a0a0a] border border-white/[0.08] shadow-premium'}
          ${panelClassName}
        `}
        style={{ maxHeight: maxPanelHeight }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar pb-safe md:pb-0">
          {/* Handle indicator for bottom sheet */}
          <div className="w-full flex justify-center pt-3 pb-1 md:hidden">
            <div className="w-12 h-1.5 bg-white/20 rounded-full" />
          </div>
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
