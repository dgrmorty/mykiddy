import { Lock } from 'lucide-react';
import type { BadgeTier } from '../data/badgeCatalog';
import type { LucideIcon } from 'lucide-react';

type TierPalette = {
  frame: string;
  core: string;
  glow: string;
  icon: string;
};

const TIER: Record<BadgeTier, TierPalette> = {
  bronze: {
    frame: 'linear-gradient(135deg, #4B2E1C, #A6683B, #F6C178)',
    core: 'linear-gradient(135deg, #24140B, #3A2312)',
    glow: 'rgba(246, 193, 120, 0.3)',
    icon: '#FFF1DA',
  },
  silver: {
    frame: 'linear-gradient(135deg, #38455F, #95A3BF, #E9EEF8)',
    core: 'linear-gradient(135deg, #1A202B, #283142)',
    glow: 'rgba(190, 208, 239, 0.28)',
    icon: '#F2F7FF',
  },
  gold: {
    frame: 'linear-gradient(135deg, #553109, #C08009, #FFE07A)',
    core: 'linear-gradient(135deg, #2B1703, #4A2806)',
    glow: 'rgba(255, 205, 96, 0.38)',
    icon: '#FFF7DB',
  },
  mythic: {
    frame: 'linear-gradient(135deg, #1a0a2e, #5b21b6, #a855f7, #e9d5ff)',
    core: 'linear-gradient(135deg, #0c0514, #3b0764)',
    glow: 'rgba(168, 85, 247, 0.5)',
    icon: '#f5e1ff',
  },
};

const LOCKED_FRAME = 'linear-gradient(135deg, #242424, #3A3A3A, #525252)';
const LOCKED_CORE = 'linear-gradient(135deg, #121212, #1B1B1B)';

interface Props {
  tier: BadgeTier;
  icon: LucideIcon;
  size?: number;
  locked?: boolean;
  className?: string;
  onClick?: () => void;
}

export function BadgeOrb({ tier, icon: Icon, size = 48, locked, className, onClick }: Props) {
  const p = TIER[tier];
  const mid = size - 4;
  const inner = size - 10;
  const iconSize = locked ? Math.round(size * 0.34) : Math.round(size * 0.4);

  return (
    <div
      className={`relative flex items-center justify-center shrink-0 ${onClick ? 'cursor-pointer' : ''} ${className ?? ''}`}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        boxShadow: locked ? 'none' : `0 2px 12px ${p.glow}`,
      }}
      onClick={onClick}
    >
      {/* Frame gradient */}
      <div
        className="absolute inset-0 rounded-full border border-white/20"
        style={{ background: locked ? LOCKED_FRAME : p.frame }}
      />
      {/* Middle ring */}
      <div
        className="absolute rounded-full bg-black/30 flex items-center justify-center"
        style={{ width: mid, height: mid }}
      >
        {/* Core */}
        <div
          className="relative rounded-full border border-white/[0.14] flex items-center justify-center overflow-hidden"
          style={{ width: inner, height: inner, background: locked ? LOCKED_CORE : p.core }}
        >
          {/* Gloss */}
          <div
            className="absolute bg-white/[0.22] -rotate-[11deg]"
            style={{
              width: inner * 0.78,
              height: inner * 0.46,
              borderRadius: inner * 0.26,
              top: Math.max(1, inner * 0.07),
              left: '11%',
            }}
          />
          {locked ? (
            <Lock size={iconSize} color="#52525b" className="relative z-10" />
          ) : (
            <Icon size={iconSize} color={p.icon} className="relative z-10" />
          )}
        </div>
      </div>
      {/* Specular highlight */}
      {!locked && (
        <div
          className="absolute bg-white/[0.45] rounded-full"
          style={{
            width: size * 0.2,
            height: size * 0.2,
            top: size * 0.13,
            right: size * 0.16,
          }}
        />
      )}
      {/* Locked veil */}
      {locked && <div className="absolute inset-0 rounded-full bg-black/30" />}
    </div>
  );
}
