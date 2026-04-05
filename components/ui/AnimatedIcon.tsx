import React from 'react';

interface AnimatedIconProps {
  name: 'sparkle' | 'play' | 'lock' | 'dashboard' | 'book' | 'calendar' | 'user' | 'usersGroup' | 'bell' | 'shield' | 'zap' | 'logout' | 'settings';
  size?: number;
  className?: string;
  active?: boolean;
}

export const AnimatedIcon: React.FC<AnimatedIconProps> = ({ name, size = 24, className = '', active = true }) => {
  const lineClass = active ? 'svg-line' : '';
  const strokeWidth = active ? '2.5' : '2';
  
  if (name === 'sparkle') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" pathLength="100" className={lineClass} />
        <path d="M20 3v4" pathLength="100" className={lineClass} style={{ animationDelay: '0.2s' }} />
        <path d="M22 5h-4" pathLength="100" className={lineClass} style={{ animationDelay: '0.2s' }} />
        <path d="M4 17v2" pathLength="100" className={lineClass} style={{ animationDelay: '0.4s' }} />
        <path d="M5 18H3" pathLength="100" className={lineClass} style={{ animationDelay: '0.4s' }} />
      </svg>
    );
  }

  if (name === 'play') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
        <polygon points="5 3 19 12 5 21 5 3" pathLength="100" className={lineClass} />
      </svg>
    );
  }

  if (name === 'dashboard') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
        <rect x="3" y="3" width="7" height="9" rx="1" pathLength="100" className={lineClass} style={{ animationDelay: '0.0s' }} />
        <rect x="14" y="3" width="7" height="5" rx="1" pathLength="100" className={lineClass} style={{ animationDelay: '0.2s' }} />
        <rect x="14" y="12" width="7" height="9" rx="1" pathLength="100" className={lineClass} style={{ animationDelay: '0.4s' }} />
        <rect x="3" y="16" width="7" height="5" rx="1" pathLength="100" className={lineClass} style={{ animationDelay: '0.6s' }} />
      </svg>
    );
  }

  if (name === 'book') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" pathLength="100" className={lineClass} style={{ animationDelay: '0s' }} />
        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" pathLength="100" className={lineClass} style={{ animationDelay: '0.3s' }} />
      </svg>
    );
  }

  if (name === 'calendar') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" pathLength="100" className={lineClass} style={{ animationDelay: '0s' }} />
        <line x1="16" y1="2" x2="16" y2="6" pathLength="100" className={lineClass} style={{ animationDelay: '0.2s' }} />
        <line x1="8" y1="2" x2="8" y2="6" pathLength="100" className={lineClass} style={{ animationDelay: '0.2s' }} />
        <line x1="3" y1="10" x2="21" y2="10" pathLength="100" className={lineClass} style={{ animationDelay: '0.4s' }} />
      </svg>
    );
  }

  if (name === 'user') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" pathLength="100" className={lineClass} style={{ animationDelay: '0s' }} />
        <circle cx="12" cy="7" r="4" pathLength="100" className={lineClass} style={{ animationDelay: '0.3s' }} />
      </svg>
    );
  }

  if (name === 'usersGroup') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" pathLength="100" className={lineClass} style={{ animationDelay: '0s' }} />
        <circle cx="9" cy="7" r="4" pathLength="100" className={lineClass} style={{ animationDelay: '0.2s' }} />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" pathLength="100" className={lineClass} style={{ animationDelay: '0.35s' }} />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" pathLength="100" className={lineClass} style={{ animationDelay: '0.5s' }} />
      </svg>
    );
  }

  if (name === 'bell') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" pathLength="100" className={lineClass} style={{ animationDelay: '0s' }} />
        <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" pathLength="100" className={lineClass} style={{ animationDelay: '0.25s' }} />
      </svg>
    );
  }

  if (name === 'shield') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" pathLength="100" className={lineClass} style={{ animationDelay: '0s' }} />
      </svg>
    );
  }

  if (name === 'lock') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" pathLength="100" className={lineClass} style={{ animationDelay: '0.2s' }} />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" pathLength="100" className={lineClass} style={{ animationDelay: '0s' }} />
      </svg>
    );
  }

  if (name === 'zap') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" pathLength="100" className={lineClass} />
      </svg>
    );
  }
  
  if (name === 'settings') {
    /* Шестерёнка: обод с «зубьями» + центр — отдельные pathLength для draw, как у dashboard/book */
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path
          d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"
          pathLength="100"
          className={lineClass}
          style={{ animationDelay: '0s' }}
        />
        <circle cx="12" cy="12" r="3" pathLength="100" className={lineClass} style={{ animationDelay: '0.35s' }} />
      </svg>
    );
  }

  if (name === 'logout') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" pathLength="100" className={lineClass} style={{ animationDelay: '0s' }} />
        <polyline points="16 17 21 12 16 7" pathLength="100" className={lineClass} style={{ animationDelay: '0.2s' }} />
        <line x1="21" y1="12" x2="9" y2="12" pathLength="100" className={lineClass} style={{ animationDelay: '0.4s' }} />
      </svg>
    );
  }

  return null;
};
