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
  const resolved = primary || fallbackUrl(name);
  const [current, setCurrent] = useState(resolved);

  useEffect(() => {
    setCurrent(resolved);
  }, [resolved, name]);

  return (
    <img
      src={current}
      alt={alt}
      className={`bg-zinc-600 ${className || ''}`.trim()}
      loading="eager"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => {
        const fb = fallbackUrl(name);
        if (current !== fb) setCurrent(fb);
      }}
    />
  );
};
