import React from 'react';

export const AnimatedLearningScene: React.FC = () => {
  return (
    <div className="relative w-[300px] h-[300px] md:w-[600px] md:h-[600px] flex items-center justify-center">
      <svg viewBox="0 0 800 600" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id="baseGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2a2a2a" />
            <stop offset="100%" stopColor="#0a0a0a" />
          </linearGradient>
          
          <linearGradient id="edgeGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#111" />
            <stop offset="15%" stopColor="#444" />
            <stop offset="50%" stopColor="#111" />
            <stop offset="85%" stopColor="#444" />
            <stop offset="100%" stopColor="#111" />
          </linearGradient>

          <radialGradient id="screenGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(230,0,43,0.15)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0)" />
          </radialGradient>

          <linearGradient id="glossGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="rgba(255,255,255,0.06)" />
            <stop offset="50%" stopColor="rgba(255,255,255,0)" />
          </linearGradient>

          <style>
            {`
              .slide-up {
                animation: slideUp 1s cubic-bezier(0.16, 1, 0.3, 1) forwards;
              }
              .float-laptop {
                animation: floatLaptop 6s ease-in-out infinite;
              }
              .shadow-pulse {
                transform-origin: 400px 445px;
                animation: shadowPulse 6s ease-in-out infinite;
              }
              .lid-open {
                transform-origin: 400px 420px;
                transform: perspective(1500px) rotateX(-90deg);
                animation: lidOpen 1.4s cubic-bezier(0.25, 1, 0.3, 1) 0.3s forwards;
              }
              .fade-in {
                opacity: 0;
                animation: fadeIn 0.8s ease-out forwards;
              }
              .code-line {
                transform-origin: left;
                transform: scaleX(0);
                opacity: 0;
              }
              .delay-1 { animation: typeCode 0.4s ease-out 1.6s forwards; }
              .delay-2 { animation: typeCode 0.5s ease-out 1.8s forwards; }
              .delay-3 { animation: typeCode 0.3s ease-out 2.1s forwards; }
              .delay-4 { animation: typeCode 0.6s ease-out 2.3s forwards; }
              .delay-5 { animation: typeCode 0.4s ease-out 2.6s forwards; }
              .delay-6 { animation: typeCode 0.2s ease-out 2.9s forwards; }
              .cursor-blink {
                opacity: 0;
                animation: fadeInOut 0.8s step-end infinite 3s;
              }

              @keyframes slideUp {
                0% { transform: translateY(40px); opacity: 0; }
                100% { transform: translateY(0); opacity: 1; }
              }
              @keyframes floatLaptop {
                0%, 100% { transform: translateY(0px); }
                50% { transform: translateY(-12px); }
              }
              @keyframes shadowPulse {
                0%, 100% { transform: scale(1); opacity: 1; }
                50% { transform: scale(0.95); opacity: 0.6; }
              }
              @keyframes lidOpen {
                0% { transform: perspective(1500px) rotateX(-90deg); }
                100% { transform: perspective(1500px) rotateX(0deg); }
              }
              @keyframes fadeIn {
                to { opacity: 1; }
              }
              @keyframes typeCode {
                0% { transform: scaleX(0); opacity: 1; }
                100% { transform: scaleX(1); opacity: 1; }
              }
              @keyframes fadeInOut {
                0%, 100% { opacity: 0; }
                50% { opacity: 1; }
              }
              @keyframes fadeToBlack {
                100% { opacity: 0; transform: scale(0.9); filter: brightness(0); }
              }
            `}
          </style>
        </defs>

        <g className="slide-up">
          {/* Ground Shadows */}
          <g className="shadow-pulse" style={{ animation: 'shadowPulse 6s ease-in-out infinite, fadeToBlack 0.4s ease-out 1.8s forwards' }}>
            <ellipse cx="400" cy="460" rx="280" ry="12" fill="rgba(230,0,43,0.15)" filter="blur(24px)" />
            <ellipse cx="400" cy="435" rx="220" ry="8" fill="rgba(0,0,0,0.8)" filter="blur(12px)" />
          </g>

          {/* Floating Laptop */}
          <g className="float-laptop" style={{ animation: 'floatLaptop 6s ease-in-out infinite, fadeToBlack 0.4s ease-out 1.8s forwards' }}>
            
            {/* Laptop Lid */}
            <g className="lid-open">
              {/* Lid Outer Shell */}
              <rect x="140" y="110" width="520" height="310" rx="16" fill="#0a0a0a" stroke="rgba(255,255,255,0.1)" strokeWidth="1.5" />
              
              {/* Screen Bezel */}
              <rect x="143" y="113" width="514" height="304" rx="14" fill="#000" />
              
              {/* Screen Display Area */}
              <rect x="152" y="122" width="496" height="274" rx="6" fill="#0f0f0f" />

              {/* Screen Core Glow */}
              <rect x="152" y="122" width="496" height="274" rx="6" fill="url(#screenGlow)" className="fade-in" style={{ animationDelay: '1.2s' }} />

              {/* Code Editor Window */}
              <g className="fade-in" style={{ animationDelay: '1.4s' }}>
                <rect x="200" y="160" width="400" height="210" rx="8" fill="rgba(15,15,15,0.9)" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
                
                {/* Editor Header */}
                <path d="M 200 168 C 200 163.58 203.58 160 208 160 L 592 160 C 596.42 160 600 163.58 600 168 L 600 186 L 200 186 Z" fill="#141414" />
                <line x1="200" y1="186" x2="600" y2="186" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />

                {/* macOS Traffic Lights */}
                <circle cx="216" cy="173" r="4.5" fill="#ff5f56" />
                <circle cx="232" cy="173" r="4.5" fill="#ffbd2e" />
                <circle cx="248" cy="173" r="4.5" fill="#27c93f" />

                {/* File Name */}
                <text x="400" y="177" fill="#666" fontFamily="monospace" fontSize="11" textAnchor="middle" letterSpacing="0.5">lesson.tsx</text>

                {/* Animated Code Lines */}
                <g transform="translate(224, 206)">
                  {/* function start */}
                  <rect x="0" y="0" width="50" height="6" fill="#e6002b" rx="3" className="code-line delay-1" />
                  <rect x="60" y="0" width="120" height="6" fill="#fff" rx="3" className="code-line delay-1" opacity="0.9" />
                  <rect x="190" y="0" width="30" height="6" fill="#666" rx="3" className="code-line delay-1" />

                  {/* indent 1 */}
                  <rect x="20" y="22" width="40" height="6" fill="#e6002b" rx="3" className="code-line delay-2" opacity="0.8" />
                  <rect x="70" y="22" width="160" height="6" fill="#fff" rx="3" className="code-line delay-2" opacity="0.7" />

                  {/* indent 2 */}
                  <rect x="40" y="44" width="180" height="6" fill="#fff" rx="3" className="code-line delay-3" opacity="0.9" />
                  <rect x="230" y="44" width="60" height="6" fill="#e6002b" rx="3" className="code-line delay-3" />

                  {/* indent 1 end */}
                  <rect x="20" y="66" width="100" height="6" fill="#fff" rx="3" className="code-line delay-4" opacity="0.6" />
                  <rect x="130" y="66" width="40" height="6" fill="#666" rx="3" className="code-line delay-4" />

                  {/* return */}
                  <rect x="20" y="88" width="50" height="6" fill="#e6002b" rx="3" className="code-line delay-5" />
                  <rect x="80" y="88" width="80" height="6" fill="#fff" rx="3" className="code-line delay-5" opacity="0.8" />

                  {/* function end */}
                  <rect x="0" y="110" width="20" height="6" fill="#666" rx="3" className="code-line delay-6" />
                  
                  {/* Blinking Cursor */}
                  <rect x="30" y="108" width="8" height="10" fill="#e6002b" rx="2" className="cursor-blink" />
                </g>
              </g>

              {/* Glossy Screen Reflection */}
              <polygon points="152,122 648,122 648,220 152,350" fill="url(#glossGrad)" pointerEvents="none" />
              
              {/* Webcam */}
              <circle cx="400" cy="117.5" r="2.5" fill="rgba(255,255,255,0.15)" />
              <circle cx="400" cy="117.5" r="1" fill="rgba(255,255,255,0.4)" />
            </g>

            {/* Laptop Base */}
            <rect x="136" y="420" width="528" height="16" rx="8" fill="url(#baseGrad)" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
            {/* Top metallic lip */}
            <path d="M 144 420 L 656 420" stroke="url(#edgeGrad)" strokeWidth="1.5" />
            {/* Trackpad Indent */}
            <rect x="350" y="420" width="100" height="6" fill="#0a0a0a" rx="2" />
            {/* Opening Notch */}
            <rect x="375" y="420" width="50" height="2" fill="#000" rx="1" />

          </g>
        </g>
      </svg>
    </div>
  );
};
