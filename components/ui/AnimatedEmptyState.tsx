import React from 'react';

export const AnimatedEmptyState: React.FC<{ message?: string }> = ({ message = 'Нет данных' }) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <div className="relative w-48 h-48 mb-6">
        <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          <style>
            {`
              .draw-empty {
                stroke-dasharray: 400;
                stroke-dashoffset: 400;
                animation: drawEmpty 1.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
              }
              .float-empty {
                animation: floatEmpty 4s ease-in-out infinite;
              }
              .glow-pulse {
                animation: pulseGlow 3s ease-in-out infinite alternate;
              }
              @keyframes drawEmpty {
                to { stroke-dashoffset: 0; }
              }
              @keyframes floatEmpty {
                0%, 100% { transform: translateY(0); }
                50% { transform: translateY(-10px); }
              }
              @keyframes pulseGlow {
                0% { opacity: 0.2; transform: scale(0.9); }
                100% { opacity: 0.5; transform: scale(1.1); }
              }
            `}
          </style>

          {/* Background Glow */}
          <circle cx="100" cy="100" r="50" fill="rgba(255,255,255,0.03)" className="glow-pulse" filter="blur(20px)" />

          <g className="float-empty">
            {/* Abstract Folders / Cards */}
            <rect x="50" y="70" width="100" height="70" rx="8" stroke="rgba(255,255,255,0.1)" strokeWidth="2" className="draw-empty" style={{ animationDelay: '0s' }} />
            <rect x="60" y="60" width="80" height="70" rx="8" stroke="rgba(255,255,255,0.05)" strokeWidth="2" className="draw-empty" style={{ animationDelay: '0.2s' }} />
            <rect x="70" y="50" width="60" height="70" rx="8" stroke="rgba(255,255,255,0.02)" strokeWidth="2" className="draw-empty" style={{ animationDelay: '0.4s' }} />

            {/* Inner Element (Magnifying Glass / Search) */}
            <circle cx="95" cy="105" r="15" stroke="rgba(255,255,255,0.2)" strokeWidth="2" className="draw-empty" style={{ animationDelay: '0.6s' }} />
            <line x1="105" y1="115" x2="115" y2="125" stroke="rgba(255,255,255,0.2)" strokeWidth="3" strokeLinecap="round" className="draw-empty" style={{ animationDelay: '0.8s' }} />
            
            {/* Sparkles around */}
            <path d="M 40 80 L 40 85 M 37.5 82.5 L 42.5 82.5" stroke="#e6002b" strokeWidth="1.5" strokeLinecap="round" className="draw-empty" style={{ animationDelay: '1s' }} />
            <path d="M 150 60 L 150 65 M 147.5 62.5 L 152.5 62.5" stroke="#e6002b" strokeWidth="1.5" strokeLinecap="round" className="draw-empty" style={{ animationDelay: '1.2s' }} />
          </g>
        </svg>
      </div>
      <p className="text-lg font-medium text-kiddy-textSecondary animate-fade-in" style={{ animationDelay: '1.5s', opacity: 0 }}>
        {message}
      </p>
    </div>
  );
};
