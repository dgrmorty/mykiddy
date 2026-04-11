/**
 * Школьные ИИ-аватары — PNG в `public/avatars/`:
 *   student-boy.png, student-girl.png
 * В БД: `profiles.avatar` — путь к одному из этих файлов.
 */
export const AVATAR_BOY_PATH = '/avatars/student-boy.png';
export const AVATAR_GIRL_PATH = '/avatars/student-girl.png';

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

/** Локальный путь, полный URL или вариант без ведущего слэша — всё считаем «школьным» PNG. */
export function isBundledSchoolAvatar(url: string | null | undefined): boolean {
  return bundledAvatarCanonical(url) != null;
}

/** Приводит к `/avatars/student-boy.png` или `...girl.png`, иначе `null`. */
export function bundledAvatarCanonical(url: string | null | undefined): string | null {
  const t = (url || '').trim().replace(/\\/g, '/');
  if (!t) return null;
  const l = t.toLowerCase();
  if (l.endsWith('student-girl.png')) return AVATAR_GIRL_PATH;
  if (l.endsWith('student-boy.png')) return AVATAR_BOY_PATH;
  return null;
}

/** Сохранённый выбор мальчик/девочка или дефолт по UUID. */
export function resolveBundledOrDefault(userId: string, raw: string | null | undefined): string {
  const c = bundledAvatarCanonical(raw);
  return c ?? defaultAvatarUrlForUserId(userId);
}
