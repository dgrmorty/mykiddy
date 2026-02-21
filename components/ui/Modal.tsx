import React, { useEffect, useState, useRef } from 'react';

const EXIT_DURATION_MS = 280;

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: string;
  /** Убрать фон контейнера — контент сам рисует карточки (избегаем эффекта «двойной модалки») */
  transparentContainer?: boolean;
}

export const Modal: React.FC<ModalProps> = ({ 
  isOpen, 
  onClose, 
  children, 
  maxWidth = 'max-w-2xl',
  transparentContainer = false
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
    const t = setTimeout(() => setIsExiting(false), EXIT_DURATION_MS);
    return () => clearTimeout(t);
  }, [isExiting]);

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
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-0 md:p-6">
      {/* Backdrop с глубоким блюром + анимация появления/исчезновения */}
      <div 
        className={`absolute inset-0 bg-black/80 backdrop-blur-xl cursor-pointer ${isExiting ? 'animate-backdrop-exit' : 'animate-backdrop-enter'}`}
        onClick={onClose}
        aria-hidden
      />
      
      {/* Окно модалки: крутая анимация входа (масштаб + сдвиг снизу) и выхода */}
      <div 
        className={`relative z-10 w-full ${maxWidth} flex flex-col h-full md:h-[85vh] overflow-y-auto md:overflow-hidden ${isExiting ? 'animate-modal-exit' : 'animate-modal-enter'} ${transparentContainer ? '' : 'bg-zinc-950 md:border md:border-white/5 md:rounded-[3rem] shadow-[0_0_80px_rgba(0,0,0,0.8)]'}`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
};