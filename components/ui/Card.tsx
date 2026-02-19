
import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
  hoverEffect?: boolean;
  glow?: boolean;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({ 
  children, 
  className = '', 
  noPadding = false, 
  hoverEffect = false,
  glow = false,
  onClick
}) => {
  return (
    <div 
      onClick={onClick}
      className={`
        relative overflow-hidden
        bg-[#09090b] 
        border border-zinc-800/60 
        rounded-2xl 
        transition-all duration-300
        ${noPadding ? '' : 'p-6'}
        ${hoverEffect ? 'hover:border-kiddy-primary/50 hover:bg-[#121214] group cursor-pointer' : ''}
        ${glow ? 'shadow-[0_0_30px_-10px_rgba(190,18,60,0.25)]' : ''}
        ${className}
      `}
    >
      {/* Top subtle glow line */}
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-zinc-700/30 to-transparent opacity-50" />
      {children}
    </div>
  );
};
