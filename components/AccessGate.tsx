
import React from 'react';
import { ShieldAlert, Lock, ExternalLink } from 'lucide-react';
import { Card } from './ui/Card';

export const AccessGate: React.FC<{ title?: string; message?: string }> = ({ 
  title = "Доступ ограничен", 
  message = "Для использования образовательных ресурсов требуется подтверждение учетной записи администратором. Пожалуйста, ожидайте завершения верификации."
}) => {
  return (
    <div className="h-full w-full flex items-center justify-center p-6 animate-in fade-in duration-500 bg-black">
      <Card className="max-w-md w-full bg-zinc-950 border-white/5 backdrop-blur-2xl relative overflow-hidden text-center py-10 shadow-[0_0_100px_-20px_rgba(190,18,60,0.1)]">
        <div className="relative z-10 flex flex-col items-center p-4">
          <div className="w-16 h-16 rounded-2xl bg-zinc-900 flex items-center justify-center mb-6 border border-white/10">
            <Lock size={32} className="text-zinc-400" />
          </div>
          <h2 className="text-2xl font-display font-bold text-white mb-2 tracking-tight uppercase italic">{title}</h2>
          <p className="text-zinc-500 text-sm mb-10 leading-relaxed font-medium">{message}</p>
          <button className="w-full py-4 bg-white text-black font-bold rounded-xl hover:bg-kiddy-primary hover:text-white transition-all flex items-center justify-center gap-2">
             <ExternalLink size={18} />
             Служба поддержки
          </button>
          <div className="mt-8 text-[8px] text-zinc-700 font-bold uppercase tracking-[0.5em] flex items-center gap-2">
             <ShieldAlert size={10} /> СИСТЕМА ВЕРИФИКАЦИИ KIDDY
          </div>
        </div>
      </Card>
    </div>
  );
};
