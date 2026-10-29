import React, { createContext, useContext, useState, useCallback, useMemo, useRef, ReactNode } from 'react';
import { Toast, ToastType } from '../components/ui/Toast';

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<{ id: number; message: string; type: ToastType }[]>([]);

  const nextIdRef = useRef(0);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    setToasts((prev) => {
      // Одинаковое сообщение уже на экране — не дублируем (часто прилетает из двух загрузок сразу).
      if (prev.some((t) => t.message === message && t.type === type)) return prev;
      nextIdRef.current += 1;
      // Не больше трёх тостов одновременно — старые уходят.
      return [...prev, { id: nextIdRef.current, message, type }].slice(-3);
    });
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const contextValue = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <div className="fixed top-[calc(env(safe-area-inset-top,0px)+5.25rem)] left-1/2 -translate-x-1/2 z-[300] flex flex-col gap-3 px-4 pointer-events-none w-full max-w-md">
        {toasts.map((toast) => (
           <div key={toast.id} className="pointer-events-auto flex justify-center">
              <Toast
                message={toast.message}
                type={toast.type}
                onClose={() => removeToast(toast.id)}
              />
           </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
