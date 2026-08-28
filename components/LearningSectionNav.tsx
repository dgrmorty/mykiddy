import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { AnimatedIcon } from './ui/AnimatedIcon';

const items = [
  { to: '/courses', label: 'Курсы', icon: 'book' as const },
  { to: '/schedule', label: 'Расписание', icon: 'calendar' as const },
];

export const LearningSectionNav: React.FC = () => {
  const { pathname } = useLocation();
  const matched = items.findIndex(
    (item) => pathname === item.to || pathname.startsWith(`${item.to}/`),
  );
  const activeIndex = matched < 0 ? 0 : matched;

  return (
    <nav
      className="learning-section-nav"
      aria-label="Раздел обучения"
      data-index={String(activeIndex)}
      style={{ '--active-index': String(activeIndex) } as React.CSSProperties}
    >
      <span className="learning-section-pill" aria-hidden />
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end
          className={({ isActive }) =>
            `learning-section-link ${isActive ? 'is-active' : ''}`
          }
        >
          {({ isActive }) => (
            <>
              <AnimatedIcon
                key={`${item.to}-${isActive ? 'active' : 'idle'}`}
                name={item.icon}
                size={17}
                active={isActive}
              />
              <span>{item.label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
};
