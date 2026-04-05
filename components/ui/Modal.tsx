import React, { useEffect, useState, useRef } from 'react';

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
  maxPanelHeight = 'calc(100dvh - 1rem)',
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

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-2 sm:p-3 md:p-5">
      <div
        className={`fixed inset-0 bg-black/70 backdrop-blur-2xl cursor-pointer transition-all duration-400 ease-entrance ${isExiting ? 'opacity-0' : 'opacity-100'}`}
        onClick={onClose}
        aria-hidden
      />
      <div
        className={`relative z-10 my-auto flex w-full flex-col overflow-hidden ${maxWidth}
          transition-all duration-400 ease-spring
          ${isExiting
            ? 'opacity-0 scale-[0.98]'
            : 'opacity-100 scale-100 animate-scale-in'}
          ${transparentContainer ? '' : 'rounded-[1.75rem] sm:rounded-[2rem] bg-kiddy-surfaceElevated border border-white/[0.08] shadow-[0_32px_80px_-16px_rgba(0,0,0,0.9)]'}
          ${panelClassName}
        `}
        style={{ maxHeight: maxPanelHeight }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar">
          {children}
        </div>
      </div>
    </div>
  );
};
