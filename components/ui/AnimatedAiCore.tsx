import React from 'react';

export const AnimatedAiCore: React.FC<{ size?: number; color?: string }> = ({ size = 200, color = '#e6002b' }) => {
  return (
    <div style={{ width: size, height: size }} className="relative flex items-center justify-center">
      <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <style>
          {`
            .ai-core-pulse {
              animation: corePulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
            }
            .ai-ring-spin-1 {
              transform-origin: 100px 100px;
              animation: ringSpin 8s linear infinite;
            }
            .ai-ring-spin-2 {
              transform-origin: 100px 100px;
              animation: ringSpin 12s linear infinite reverse;
            }
            .draw-core {
              stroke-dasharray: 600;
              stroke-dashoffset: 600;
              animation: drawCore 2s ease-out forwards;
            }
            
            @keyframes corePulse {
              0%, 100% { opacity: 1; transform: scale(1); }
              50% { opacity: 0.6; transform: scale(0.9); }
            }
            @keyframes ringSpin {
              100% { transform: rotate(360deg); }
            }
            @keyframes drawCore {
              to { stroke-dashoffset: 0; }
            }
          `}
        </style>

        {/* Ambient Glow */}
        <circle cx="100" cy="100" r="40" fill={color} className="ai-core-pulse" opacity="0.1" filter="blur(20px)" />
        <circle cx="100" cy="100" r="20" fill={color} className="ai-core-pulse" opacity="0.2" filter="blur(10px)" />

        {/* Center Node */}
        <circle cx="100" cy="100" r="8" fill={color} className="ai-core-pulse" />
        
        {/* Connection Lines (Synapses) */}
        <g stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.5">
          <line x1="100" y1="100" x2="100" y2="50" className="draw-core" style={{ animationDelay: '0.2s' }} />
          <line x1="100" y1="100" x2="143" y2="75" className="draw-core" style={{ animationDelay: '0.4s' }} />
          <line x1="100" y1="100" x2="143" y2="125" className="draw-core" style={{ animationDelay: '0.6s' }} />
          <line x1="100" y1="100" x2="100" y2="150" className="draw-core" style={{ animationDelay: '0.8s' }} />
          <line x1="100" y1="100" x2="57" y2="125" className="draw-core" style={{ animationDelay: '1.0s' }} />
          <line x1="100" y1="100" x2="57" y2="75" className="draw-core" style={{ animationDelay: '1.2s' }} />
        </g>

        {/* Outer Tech Rings */}
        <g className="ai-ring-spin-1">
          <circle cx="100" cy="100" r="60" stroke="rgba(255,255,255,0.05)" strokeWidth="1" strokeDasharray="10 4" />
          <circle cx="100" cy="40" r="3" fill="#fff" opacity="0.8" />
          <circle cx="100" cy="160" r="2" fill={color} opacity="0.6" />
        </g>

        <g className="ai-ring-spin-2">
          <circle cx="100" cy="100" r="75" stroke="rgba(255,255,255,0.03)" strokeWidth="1" strokeDasharray="40 10 5 10" />
          <circle cx="25" cy="100" r="2" fill={color} opacity="0.8" />
        </g>

      </svg>
    </div>
  );
};
