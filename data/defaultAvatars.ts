/** Статические ИИ-аватары в `public/avatars/` (Vite отдаёт с корня сайта). */
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
