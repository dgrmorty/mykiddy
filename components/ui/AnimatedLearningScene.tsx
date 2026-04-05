import React from 'react';

export const AnimatedLearningScene: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative h-16 w-16">
        <div className="absolute inset-0 animate-pulse rounded-full bg-kiddy-cherry/15 blur-2xl" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="h-11 w-11 rounded-full border-2 border-white/10 border-t-kiddy-cherry animate-spin"
            style={{ animationDuration: '0.8s' }}
          />
        </div>
      </div>
    </div>
  );
};
