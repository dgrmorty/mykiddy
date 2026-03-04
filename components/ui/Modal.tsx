import React, { useEffect, useState, useRef } from 'react';

const EXIT_DURATION_MS = 400;

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: string;
  transparentContainer?: boolean;
  onClosed?: () => void;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  children,
  maxWidth = 'max-w-md',
  transparentContainer = false,
  onClosed,
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
    <div className="fixed inset-0 z-[200] min-h-screen flex items-center justify-center p-4 md:p-6">
      <div
        className={`absolute inset-0 bg-black/60 backdrop-blur-xl cursor-pointer transition-all duration-400 ease-out ${isExiting ? 'opacity-0' : 'opacity-100'}`}
        onClick={onClose}
        aria-hidden
      />
      <div
        className={`relative z-10 w-full max-h-[90vh] overflow-y-auto custom-scrollbar ${maxWidth} transition-all duration-400 cubic-bezier(0.175, 0.885, 0.32, 1.1) ${isExiting ? 'opacity-0 translate-y-8 scale-95 filter blur-sm' : 'opacity-100 translate-y-0 scale-100 animate-reveal-up'} ${transparentContainer ? '' : 'rounded-3xl bg-kiddy-surfaceElevated border border-white/[0.04] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.8)]'}`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
};
