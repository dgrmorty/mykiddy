import React from 'react';
import { AvatarImage } from './AvatarImage';
import { User } from '../types';
import { resolveAvatarDisplayPath } from '../data/defaultAvatars';

const SIZE_MAP = { xs: 28, sm: 36, md: 44, lg: 56, xl: 96 } as const;
export type UserAvatarSize = keyof typeof SIZE_MAP;

interface UserAvatarProps {
  user: Pick<User, 'id' | 'avatar' | 'name'> & { avatarAccessory?: string | null };
  size?: UserAvatarSize;
  className?: string;
  /** Классы для круга с фото */
  photoClassName?: string;
}

/** Аватар: база boy/girl из `avatar` + опционально отдельная картинка с аксессуаром. */
export const UserAvatar: React.FC<UserAvatarProps> = ({
  user,
  size = 'md',
  className = '',
  photoClassName,
}) => {
  const wrap =
    photoClassName ||
    `inline-flex shrink-0 overflow-hidden rounded-full border border-white/[0.1] ${size === 'xs' ? 'h-7 w-7' : size === 'sm' ? 'h-9 w-9' : size === 'md' ? 'h-11 w-11' : size === 'lg' ? 'h-14 w-14' : 'h-24 w-24'}`;

  const displaySrc = resolveAvatarDisplayPath(user.id, user.avatar, user.avatarAccessory);

  return (
    <span className={`${wrap} ${className}`.trim()}>
      <AvatarImage
        src={displaySrc}
        name={user.name}
        alt=""
        className="block h-full w-full origin-center scale-[1.14] object-cover object-center"
      />
    </span>
  );
};
