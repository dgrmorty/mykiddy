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
        flex items-center gap-3 px-5 py-3.5 rounded-2xl border backdrop-blur-xl shadow-elevated
        ${accent.border} ${accent.bg}
        transition-all duration-350 ease-entrance
        ${exiting ? 'opacity-0 translate-y-2 scale-95 blur-sm' : 'opacity-100 translate-y-0 scale-100'}
      `}
      style={{ animation: exiting ? 'none' : 'fade-in-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) both' }}
    >
      <span className={accent.icon}>{icons[type]}</span>
      <span className="text-sm font-semibold text-white flex-1">{message}</span>
      <button
        onClick={handleClose}
        className="ml-1 p-1 rounded-lg opacity-50 hover:opacity-100 hover:bg-white/5 transition-all"
      >
        <X size={14} className="text-white" />
      </button>
    </div>
  );
};
