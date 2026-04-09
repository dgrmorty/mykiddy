/** Текущая версия ключа: смена префикса сбрасывает локальный выбор значков на кольце. */
export const BADGE_EQUIP_KEY_PREFIX = 'mykiddy_equipped_badges_v3_';

export function badgeEquipStorageKey(userId: string): string {
  return `${BADGE_EQUIP_KEY_PREFIX}${userId}`;
}

/** Удаляет ключи старых версий (v1 без суффикса, и т.д.), чтобы не тянуть чужой/битый выбор. */
export function purgeLegacyEquippedBadgeKeys(): void {
  if (typeof localStorage === 'undefined') return;
  const toRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k) continue;
    if (k.startsWith('mykiddy_equipped_badges_') && !k.startsWith(BADGE_EQUIP_KEY_PREFIX)) {
      toRemove.push(k);
    }
  }
  toRemove.forEach((k) => localStorage.removeItem(k));
}
