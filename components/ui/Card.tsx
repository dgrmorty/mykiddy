import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
  hoverEffect?: boolean;
  glow?: boolean;
  hero?: boolean;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  noPadding = false,
  hoverEffect = false,
  glow = false,
  hero = false,
  onClick,
}) => (
  <div
    onClick={onClick}
    role={onClick ? 'button' : undefined}
      className={`
        card-premium relative overflow-hidden group flex flex-col
        ${noPadding ? '' : 'p-6 md:p-8'}
        ${hoverEffect ? 'cursor-pointer' : ''}
        ${className}
      `}
    >
      {hero && (
        <div className="absolute inset-0 bg-gradient-to-br from-kiddy-cherryDim to-transparent opacity-50 pointer-events-none" />
      )}
      {glow && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-32 bg-kiddy-cherryGlow blur-[64px] opacity-20 pointer-events-none group-hover:opacity-40 transition-opacity duration-500" />
      )}
    <div className={`relative z-10 w-full h-full ${className.includes('flex') ? 'flex' : ''} ${className.includes('flex-col') ? 'flex-col' : ''} ${className.includes('justify-end') ? 'justify-end' : ''} ${className.includes('justify-center') ? 'justify-center' : ''} ${className.includes('items-center') ? 'items-center' : ''}`}>
      {children}
    </div>
  </div>
);
