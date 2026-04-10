/**
 * Школьные ИИ-аватары — отдельный PNG на каждую комбинацию (не слои в рантайме).
 * Положи файлы в `public/avatars/`:
 *   - student-boy.png, student-girl.png — база без аксессуара
 *   - student-boy-cap.png, student-girl-cap.png, … glasses, headphones — полные кадры с аксессуаром
 * В БД: `profiles.avatar` = boy|girl путь; `profiles.avatar_accessory` = none | cap | glasses | headphones.
 */
export const AVATAR_BOY_PATH = '/avatars/student-boy.png';
export const AVATAR_GIRL_PATH = '/avatars/student-girl.png';

/** Идентификаторы аксессуаров = суффикс в имени файла после `student-{boy|girl}-`. */
export const AVATAR_ACCESSORY_IDS = ['cap', 'glasses', 'headphones'] as const;
export type AvatarAccessoryId = (typeof AVATAR_ACCESSORY_IDS)[number];

export const AVATAR_ACCESSORY_LABELS: Record<AvatarAccessoryId, string> = {
  cap: 'Кепка',
  glasses: 'Очки',
  headphones: 'Наушники',
};

/** Первый байт UUID — тот же принцип, что в миграции `get_byte(uuid_send(id), 0)`. */
function uuidFirstByte(id: string): number {
  const hex = id.replace(/-/g, '').toLowerCase();
  if (hex.length !== 32) throw new Error('invalid uuid');
  return parseInt(hex.slice(0, 2), 16);
}

/** Стабильный выбор «мальчик / девочка» по id пользователя. */
export function defaultAvatarUrlForUserId(userId: string): string {
  if (!userId || userId === 'guest') return AVATAR_BOY_PATH;
  try {
    return uuidFirstByte(userId) % 2 === 0 ? AVATAR_BOY_PATH : AVATAR_GIRL_PATH;
  } catch {
    return AVATAR_BOY_PATH;
  }
}

/** Когда нет id (списки по имени), детерминированно как с id по строке. */
export function defaultAvatarUrlForSeed(seed: string): string {
  return defaultAvatarUrlForUserId(seed || 'guest');
}

export function isBundledSchoolAvatar(url: string | null | undefined): boolean {
  const t = (url || '').trim();
  return t === AVATAR_BOY_PATH || t === AVATAR_GIRL_PATH;
}

/** Сохранённый выбор мальчик/девочка или дефолт по UUID. */
export function resolveBundledOrDefault(userId: string, raw: string | null | undefined): string {
  return isBundledSchoolAvatar(raw) ? (raw as string).trim() : defaultAvatarUrlForUserId(userId);
}

export function normalizeAvatarAccessory(raw: string | null | undefined): 'none' | AvatarAccessoryId {
  const a = (raw || 'none').toLowerCase().trim();
  if (a === 'cap' || a === 'glasses' || a === 'headphones') return a;
  return 'none';
}

function genderKeyFromBasePath(basePath: string): 'boy' | 'girl' {
  return basePath.includes('girl') ? 'girl' : 'boy';
}

/**
 * Итоговый URL картинки: база (boy/girl) + при аксессуаре файл `student-{boy|girl}-{cap|glasses|headphones}.png`.
 */
export function resolveAvatarDisplayPath(
  userId: string,
  baseAvatarPath: string | null | undefined,
  accessoryRaw: string | null | undefined,
): string {
  const base = resolveBundledOrDefault(userId, baseAvatarPath);
  const acc = normalizeAvatarAccessory(accessoryRaw);
  if (acc === 'none') return base;
  const g = genderKeyFromBasePath(base);
  return `/avatars/student-${g}-${acc}.png`;
}
