import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  noPadding?: boolean;
  hoverEffect?: boolean;
  glow?: boolean;
  hero?: boolean;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  style,
  noPadding = false,
  hoverEffect = false,
  glow = false,
  hero = false,
  onClick,
}) => {
  const innerRow = className.includes('flex') && !className.includes('flex-col');
  const innerItems = className.includes('items-start')
    ? 'items-start'
    : className.includes('items-end')
      ? 'items-end'
      : className.includes('items-center')
        ? 'items-center'
        : '';
  const innerJustify = className.includes('justify-between')
    ? 'justify-between'
    : className.includes('justify-center')
      ? 'justify-center'
      : className.includes('justify-end')
        ? 'justify-end'
        : '';

  return (
  <div
    onClick={onClick}
    role={onClick ? 'button' : undefined}
    style={style}
    className={`
      card-premium relative overflow-hidden group flex flex-col
      ${noPadding ? '' : 'p-6 md:p-8'}
      ${hoverEffect || onClick ? 'cursor-pointer hover-lift' : ''}
      ${className}
    `}
  >
    {hero && (
      <div className="absolute inset-0 bg-gradient-to-br from-kiddy-cherryDim to-transparent opacity-50 pointer-events-none" />
    )}
    {glow && (
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-32 bg-kiddy-cherryGlow blur-[64px] opacity-20 pointer-events-none group-hover:opacity-40 transition-opacity duration-600" />
    )}
    <div
      className={`relative z-10 min-h-0 min-w-0 w-full h-full ${className.includes('flex') ? 'flex' : ''} ${className.includes('flex-col') ? 'flex-col' : ''} ${innerJustify} ${innerItems} ${innerRow ? 'gap-4 md:gap-5' : ''}`}
    >
      {children}
    </div>
  </div>
  );
};
