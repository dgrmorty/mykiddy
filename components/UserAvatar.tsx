import React from 'react';
import { AvatarImage } from './AvatarImage';
import { User } from '../types';
import { resolveBundledOrDefault } from '../data/defaultAvatars';

const SIZE_MAP = { xs: 28, sm: 36, md: 44, lg: 56, xl: 96 } as const;
export type UserAvatarSize = keyof typeof SIZE_MAP;

interface UserAvatarProps {
  user: Pick<User, 'id' | 'avatar' | 'name'>;
  size?: UserAvatarSize;
  className?: string;
  /** Классы для круга с фото */
  photoClassName?: string;
  /** Индикатор под авой: зелёный — недавно в сети, серый — офлайн */
  presence?: 'online' | 'offline';
}

/** Аватар ученика: boy/girl из `avatar` (школьный набор). */
export const UserAvatar: React.FC<UserAvatarProps> = ({
  user,
  size = 'md',
  className = '',
  photoClassName,
  presence,
}) => {
  const wrap =
    photoClassName ||
    `inline-flex shrink-0 overflow-hidden rounded-full border border-white/[0.1] ${size === 'xs' ? 'h-7 w-7' : size === 'sm' ? 'h-9 w-9' : size === 'md' ? 'h-11 w-11' : size === 'lg' ? 'h-14 w-14' : 'h-24 w-24'}`;

  const displaySrc = resolveBundledOrDefault(user.id, user.avatar);

  const dot =
    presence != null ? (
      <span
        className={`pointer-events-none absolute -bottom-0.5 -left-0.5 z-[1] h-2.5 w-2.5 rounded-full border-2 border-zinc-950 shadow-sm ${
          presence === 'online' ? 'bg-emerald-500' : 'bg-zinc-500'
        }`}
        title={presence === 'online' ? 'В сети' : 'Не в сети'}
        aria-hidden
      />
    ) : null;

  return (
    <span className={`relative inline-flex shrink-0 ${className}`.trim()}>
      <span className={wrap}>
        <AvatarImage
          src={displaySrc}
          name={user.name}
          alt=""
          className="block h-full w-full origin-center scale-[1.14] object-cover object-center"
        />
      </span>
      {dot}
    </span>
  );
};
