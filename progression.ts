/** Сколько XP нужно на один полный уровень (уровень 1 = 0…XP_PER_LEVEL−1). */
export const XP_PER_LEVEL = 500;

export function levelFromXp(xp: number): number {
  return Math.floor(Math.max(0, xp) / XP_PER_LEVEL) + 1;
}

/** Доля прогресса внутри текущего уровня, 0–100. */
export function xpLevelProgressPercent(xp: number): number {
  const x = Math.max(0, xp);
  return ((x % XP_PER_LEVEL) / XP_PER_LEVEL) * 100;
}
