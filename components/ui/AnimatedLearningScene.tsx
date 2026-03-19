import React from 'react';

export const AnimatedLearningScene: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center gap-8">
      <div className="relative w-20 h-20">
        <div className="absolute inset-0 rounded-full bg-kiddy-cherry/20 blur-2xl animate-pulse" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-12 h-12 rounded-full border-2 border-white/10 border-t-kiddy-cherry animate-spin" style={{ animationDuration: '0.8s' }} />
        </div>
      </div>
      <div className="flex flex-col items-center gap-3">
        <p className="text-white font-display font-bold text-lg tracking-tight">Загружаем урок</p>
        <div className="flex gap-1.5">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-kiddy-cherry"
              style={{
                animation: 'premiumPulse 1.2s ease-in-out infinite',
                animationDelay: `${i * 0.15}s`,
              }}
            />
          ))}
        </div>
      </div>
      <style>{`
        @keyframes premiumPulse {
          0%, 100% { opacity: 0.2; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
};
