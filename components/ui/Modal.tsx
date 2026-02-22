import React, { useEffect, useState, useRef } from 'react';

const EXIT_DURATION_MS = 200;

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: string;
  /** Убрать фон контейнера — контент сам рисует карточки (избегаем эффекта «двойной модалки») */
  transparentContainer?: boolean;
  /** Вызывается после завершения анимации закрытия (чтобы родитель мог убрать контент и размонтировать) */
  onClosed?: () => void;
}

export const Modal: React.FC<ModalProps> = ({ 
  isOpen, 
  onClose, 
  children, 
  maxWidth = 'max-w-2xl',
  transparentContainer = false,
  onClosed
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
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY || '0') * -1);
      }
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
      {/* Backdrop: появление — анимация, закрытие — простой fade */}
      <div 
        className={`absolute inset-0 bg-black/80 backdrop-blur-xl cursor-pointer transition-opacity duration-200 ease-out ${isExiting ? 'opacity-0' : 'opacity-100'} ${!isExiting ? 'animate-backdrop-enter' : ''}`}
        onClick={onClose}
        aria-hidden
      />
      
      {/* Окно: открытие — анимация, закрытие — только fade, без scale/translate */}
      <div 
        className={`relative z-10 w-full max-h-[90vh] md:max-h-[85vh] ${maxWidth} flex flex-col h-[90vh] md:h-[85vh] overflow-y-auto md:overflow-hidden transition-opacity duration-200 ease-out ${isExiting ? 'opacity-0' : 'opacity-100'} ${!isExiting ? 'animate-modal-enter' : ''} ${transparentContainer ? '' : 'bg-zinc-950 md:border md:border-white/5 md:rounded-[3rem] shadow-[0_0_80px_rgba(0,0,0,0.8)]'}`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
};