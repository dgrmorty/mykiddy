import React from 'react';

export const AnimatedEmptyState: React.FC<{ message?: string }> = ({ message = 'Нет данных' }) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <div className="relative mb-6">
        <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
          <div className="w-6 h-6 rounded-full border-2 border-white/10 border-t-kiddy-cherry animate-spin" style={{ animationDuration: '0.9s' }} />
        </div>
        <div className="absolute -inset-4 bg-kiddy-cherry/5 rounded-3xl blur-xl" style={{ animation: 'emptyGlow 3s ease-in-out infinite alternate' }} />
      </div>
      <p className="text-sm font-semibold text-kiddy-textSecondary tracking-wide animate-fade-in">
        {message}
      </p>
      <style>{`
        @keyframes emptyGlow {
          0% { opacity: 0.3; }
          100% { opacity: 0.6; }
        }
      `}</style>
    </div>
  );
};
