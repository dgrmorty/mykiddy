import React, { useEffect, useState } from 'react';

type ThemedLoaderProps =
  | { variant: 'inline'; className?: string; message?: never }
  | { variant?: 'section' | 'fullscreen'; className?: string; message: string };

const LoaderArtwork: React.FC<{ size: number }> = ({ size }) => (
  <svg
    className="themed-loader__svg"
    viewBox="0 0 120 96"
    width={size}
    height={size * 0.8}
    aria-hidden="true"
  >
    <path
      pathLength="1"
      className="themed-loader__lid"
      d="M28 14h64a6 6 0 0 1 6 6v46H22V20a6 6 0 0 1 6-6Z"
    />
    <path pathLength="1" className="themed-loader__screen" d="M29 22h62v36H29z" />
    <path pathLength="1" className="themed-loader__base" d="M15 68h90l-7 10H22l-7-10Z" />
    <path pathLength="1" className="themed-loader__code themed-loader__code--one" d="M38 34h20" />
    <path pathLength="1" className="themed-loader__code themed-loader__code--two" d="M38 42h35" />
    <path pathLength="1" className="themed-loader__code themed-loader__code--three" d="M38 50h26" />
    <circle className="themed-loader__cursor" cx="70" cy="50" r="2.5" />
  </svg>
);

export const ThemedLoader: React.FC<ThemedLoaderProps> = (props) => {
  const variant = props.variant ?? 'section';
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    if (variant === 'inline') return;
    setSlow(false);
    const timer = window.setTimeout(() => setSlow(true), 5000);
    return () => window.clearTimeout(timer);
  }, [variant, props.message]);

  const size = variant === 'fullscreen' ? 112 : variant === 'section' ? 80 : 20;

  if (variant === 'inline') {
    return (
      <span
        className={`themed-loader themed-loader--inline ${props.className ?? ''}`}
        role="status"
        aria-label="Загрузка"
      >
        <LoaderArtwork size={20} />
      </span>
    );
  }

  return (
    <div
      className={`themed-loader themed-loader--${variant} ${props.className ?? ''}`}
      role="status"
      aria-live="polite"
    >
      <LoaderArtwork size={size} />
      <p className="themed-loader__message">{props.message}</p>
      {slow && <p className="themed-loader__slow">Сеть отвечает медленнее обычного</p>}
    </div>
  );
};
