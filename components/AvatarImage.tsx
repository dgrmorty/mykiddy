import React, { useEffect, useState } from 'react';
import { defaultAvatarUrlForSeed } from '../data/defaultAvatars';

function fallbackUrl(name: string) {
  return defaultAvatarUrlForSeed(name || 'user');
}

interface Props {
  src?: string | null;
  name?: string;
  alt?: string;
  className?: string;
}

/** Аватар с запасным URL, если картинка не загрузилась (сеть, кэш вкладки, истёкший URL). */
export const AvatarImage: React.FC<Props> = ({ src, name = 'U', alt = '', className }) => {
  const primary = (src || '').trim();
  const [current, setCurrent] = useState(primary || fallbackUrl(name));

  useEffect(() => {
    setCurrent(primary || fallbackUrl(name));
  }, [primary, name]);

  return (
    <img
      src={current}
      alt={alt}
      className={className}
      referrerPolicy="no-referrer"
      onError={() => {
        if (current !== fallbackUrl(name)) setCurrent(fallbackUrl(name));
      }}
    />
  );
};
