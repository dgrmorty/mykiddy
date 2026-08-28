import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { User, Role } from '../types';
import { AnimatedIcon } from './ui/AnimatedIcon';
import { BrandLogo } from './BrandLogo';
import { UserAvatar } from './UserAvatar';
import { useAuth } from '../contexts/AuthContext';
import { useBranding } from '../contexts/BrandingContext';
import { useNotificationSummary } from '../contexts/NotificationContext';
import { useScrolledCompact } from '../hooks/useScrolledCompact';

interface AppTopNavProps {
  currentUser: User;
}

type NavIcon = 'dashboard' | 'book' | 'calendar' | 'usersGroup' | 'user' | 'shield';

interface NavItem {
  iconName: NavIcon;
  label: string;
  path: string;
  matches: string[];
  locked: boolean;
  onboardingAnchor?: string;
}

export const AppTopNav: React.FC<AppTopNavProps> = ({ currentUser }) => {
  const { openAuthModal } = useAuth();
  const { logoUrl } = useBranding();
  const { unreadCount } = useNotificationSummary();
  const { pathname } = useLocation();
  const compact = useScrolledCompact();
  const isGuest = currentUser.role === Role.GUEST;
  const isAdmin = currentUser.role === Role.ADMIN;

  const items: NavItem[] = [
    { iconName: 'dashboard', label: 'Главная', path: '/', matches: ['/'], locked: false, onboardingAnchor: 'nav-home' },
    { iconName: 'book', label: 'Обучение', path: '/courses', matches: ['/courses', '/schedule'], locked: isGuest, onboardingAnchor: 'nav-library' },
    { iconName: 'usersGroup', label: 'Сообщество', path: '/community', matches: ['/community', '/users'], locked: isGuest, onboardingAnchor: 'nav-community' },
  ];

  const isItemActive = (item: NavItem) =>
    item.matches.some((route) =>
      route === '/' ? pathname === '/' : pathname === route || pathname.startsWith(`${route}/`),
    );

  const handleNavClick = (e: React.MouseEvent, locked: boolean) => {
    if (locked) {
      e.preventDefault();
      openAuthModal();
    }
  };

  return (
    <div className="nav-shell" data-compact={compact ? 'true' : 'false'}>
      <nav className="nav-island" aria-label="Основная навигация">
        <Link
          to="/"
          aria-label="На главную"
          className="nav-island-logo"
        >
          <BrandLogo
            url={logoUrl}
            alt="Дети В ТОПЕ"
            className="h-8 w-auto max-w-[132px] object-contain object-left sm:h-9"
            wordmarkClassName="max-w-[140px] truncate"
          />
        </Link>

        <div className="nav-island-links">
          {items.map((item) => {
            const active = isItemActive(item) && !item.locked;
            return (
              <Link
                key={item.path}
                id={item.onboardingAnchor && !item.locked ? `tour-dsk-${item.onboardingAnchor}` : undefined}
                to={item.path}
                aria-current={active ? 'page' : undefined}
                onClick={(e) => handleNavClick(e, item.locked)}
                className={`nav-island-link ${item.locked ? 'is-locked' : ''} ${active ? 'is-active' : ''}`}
              >
                <AnimatedIcon
                  key={`${item.path}-${active ? 'active' : 'idle'}`}
                  name={item.iconName}
                  size={19}
                  className="nav-island-link-icon"
                  active={active}
                />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>

        <div className="nav-island-actions">
          {!isGuest && (
            <Link
              id="tour-dsk-notifications"
              to="/notifications"
              title="Уведомления"
              aria-label="Уведомления"
              className="nav-island-iconbtn"
            >
              <AnimatedIcon name="bell" size={18} active={false} />
              {unreadCount > 0 && (
                <span className="nav-island-badge">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </Link>
          )}

          {isAdmin && (
            <Link
              id="tour-dsk-nav-admin"
              to="/admin"
              title="Управление"
              aria-label="Управление"
              className={`nav-island-iconbtn ${pathname === '/admin' ? 'is-active' : ''}`}
            >
              <AnimatedIcon name="shield" size={18} active={pathname === '/admin'} />
            </Link>
          )}

          {isGuest ? (
            <button type="button" onClick={openAuthModal} className="nav-island-cta">
              Войти
            </button>
          ) : (
            <Link to="/profile" className="nav-island-avatar" title="Профиль" aria-label="Профиль">
              <UserAvatar user={currentUser} size="xs" />
            </Link>
          )}
        </div>
      </nav>
    </div>
  );
};
