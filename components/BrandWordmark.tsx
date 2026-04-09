import React from 'react';

interface Props {
  className?: string;
  /** Компактная строка для шапки */
  compact?: boolean;
}

/** Текстовый знак, если в БД нет logo_url или картинка не загрузилась */
export function BrandWordmark({ className = '', compact }: Props) {
  return (
    <span
      className={`inline-flex items-center font-display font-extrabold tracking-tight leading-none ${compact ? 'text-base' : 'text-lg md:text-xl'} ${className}`}
    >
      <span className="text-white">Дети </span>
      <span className="bg-gradient-to-r from-kiddy-cherry to-kiddy-cherryHover bg-clip-text text-transparent italic">
        в топе
      </span>
    </span>
  );
}
