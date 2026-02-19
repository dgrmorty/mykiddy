import React, { useEffect } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: string;
}

export const Modal: React.FC<ModalProps> = ({ 
  isOpen, 
  onClose, 
  children, 
  maxWidth = 'max-w-2xl'
}) => {
  useEffect(() => {
    if (isOpen) {
      // Сохраняем текущую позицию скролла и блокируем body
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';
    } else {
      // Возвращаем body в исходное состояние
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
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-0 md:p-6 animate-in fade-in duration-500">
      {/* Backdrop с глубоким блюром */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-xl cursor-pointer" 
        onClick={onClose} 
      />
      
      {/* Modal Container: h-full на мобилках, max-h на десктопе */}
      <div 
        className={`relative z-10 w-full ${maxWidth} bg-zinc-950 md:border md:border-white/5 md:rounded-[3rem] shadow-[0_0_80px_rgba(0,0,0,0.8)] flex flex-col h-full md:h-[85vh] animate-in zoom-in-95 slide-in-from-bottom-10 duration-500 overflow-hidden`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
};