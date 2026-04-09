import React, { useState } from 'react';
import { sanitizeLogoUrl } from '../utils/branding';
import { BrandWordmark } from './BrandWordmark';

interface Props {
  url: string | null | undefined;
  alt: string;
  className?: string;
  /** Классы для текстового запасного варианта */
  wordmarkClassName?: string;
  compactWordmark?: boolean;
}

export function BrandLogo({ url, alt, className = '', wordmarkClassName = '', compactWordmark }: Props) {
  const safe = sanitizeLogoUrl(url ?? null);
  const [failed, setFailed] = useState(false);

  if (!safe || failed) {
    return <BrandWordmark compact={compactWordmark} className={wordmarkClassName} />;
  }

  return (
    <img
      src={safe}
      alt={alt}
      className={className}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
    />
  );
}
