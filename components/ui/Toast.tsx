import React, { useEffect, useState } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
  message: string;
  type: ToastType;
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setExiting(true), 3600);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!exiting) return;
    const t = setTimeout(onClose, 350);
    return () => clearTimeout(t);
  }, [exiting, onClose]);

  const handleClose = () => setExiting(true);

  const accentMap = {
    success: { border: 'border-green-500/30', icon: 'text-green-400', bg: 'bg-green-500/5' },
    error: { border: 'border-red-500/30', icon: 'text-red-400', bg: 'bg-red-500/5' },
    info: { border: 'border-blue-500/30', icon: 'text-blue-400', bg: 'bg-blue-500/5' },
  };
  const accent = accentMap[type];

  const icons = {
    success: <CheckCircle size={18} />,
    error: <AlertCircle size={18} />,
    info: <Info size={18} />,
  };

  return (
    <div
      className={`
        flex items-center gap-3 px-4 py-3 rounded-full border border-white/10 bg-black/90 backdrop-blur-2xl shadow-island
        transition-all duration-400 ease-out
        ${exiting ? 'opacity-0 -translate-y-8 scale-90' : 'opacity-100 translate-y-0 scale-100'}
      `}
      style={{ animation: exiting ? 'none' : 'slide-down-island 0.5s cubic-bezier(0.16, 1, 0.3, 1) both' }}
    >
      <div className={`flex items-center justify-center w-8 h-8 rounded-full bg-white/5 ${accent.icon}`}>
        {icons[type]}
      </div>
      <span className="text-sm font-bold text-white flex-1 tracking-wide pr-2">{message}</span>
      <style>{`
        @keyframes slide-down-island {
          0% { opacity: 0; transform: translateY(-20px) scale(0.9); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
};
