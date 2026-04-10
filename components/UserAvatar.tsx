import React from 'react';
import { AvatarImage } from './AvatarImage';
import { ProgrammerAvatar } from './ProgrammerAvatar';
import { Role, User } from '../types';
import { clampEquipToLevel, mergeAvatarEquip } from '../data/avatarCatalog';

const SIZE_MAP = { xs: 28, sm: 36, md: 44, lg: 56, xl: 96 } as const;
export type UserAvatarSize = keyof typeof SIZE_MAP;

interface UserAvatarProps {
  user: Pick<User, 'role' | 'avatar' | 'name' | 'level' | 'avatarCosmetic'>;
  /** Ученик: слойный аватар; остальные — фото */
  size?: UserAvatarSize;
  className?: string;
  /** Классы для режима фото (круглый аватар) */
  photoClassName?: string;
}

/** Аватар ученика — персонаж-программист; у остальных ролей — загруженное фото. */
export const UserAvatar: React.FC<UserAvatarProps> = ({
  user,
  size = 'md',
  className = '',
  photoClassName,
}) => {
  const px = SIZE_MAP[size];

  if (user.role === Role.STUDENT) {
    const equip = clampEquipToLevel(mergeAvatarEquip(user.avatarCosmetic), user.level);
    return (
      <div
        className={`relative flex shrink-0 items-end justify-center overflow-hidden rounded-xl border border-white/[0.1] bg-zinc-950/90 ${className}`}
        style={{ width: px, height: px }}
      >
        <div className="flex max-h-full w-full items-end justify-center" style={{ transform: 'scale(0.92)', transformOrigin: '50% 100%' }}>
          <ProgrammerAvatar equip={equip} size={Math.round(px * 1.15)} />
        </div>
      </div>
    );
  }

  const photo =
    photoClassName ||
    `rounded-full border border-white/[0.1] object-cover ${size === 'xs' ? 'h-7 w-7' : size === 'sm' ? 'h-9 w-9' : size === 'md' ? 'h-11 w-11' : size === 'lg' ? 'h-14 w-14' : 'h-24 w-24'}`;

  return (
    <AvatarImage
      src={user.avatar}
      name={user.name}
      alt=""
      className={`${photo} ${className}`.trim()}
    />
  );
};
