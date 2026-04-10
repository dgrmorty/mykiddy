import React from 'react';
import { layersToRender, type AvatarEquipMap } from '../data/avatarCatalog';

interface ProgrammerAvatarProps {
  equip: AvatarEquipMap;
  /** Ширина превью, высота ~1.4× для полного силуэта */
  size?: number;
  className?: string;
}

export const ProgrammerAvatar: React.FC<ProgrammerAvatarProps> = ({
  equip,
  size = 80,
  className = '',
}) => {
  const layers = layersToRender(equip);
  const h = Math.round(size * 1.35);
  return (
    <div
      className={`relative inline-flex shrink-0 select-none ${className}`}
      style={{ width: size, height: h }}
      aria-hidden
    >
      {layers.map(({ def, src }) => (
        <img
          key={`${def.slot}-${def.id}`}
          src={src}
          alt=""
          className="pointer-events-none absolute inset-0 h-full w-full object-contain object-bottom"
          loading="lazy"
          draggable={false}
        />
      ))}
    </div>
  );
};
