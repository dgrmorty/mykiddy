/** Считаем «онлайн», если last_seen не старше этого окна (пульс ~55 с). */
export const LAST_SEEN_ONLINE_WINDOW_MS = 3 * 60 * 1000;

export type PresenceStatus = 'online' | 'offline';

export function presenceFromLastSeen(lastSeenAt: string | null | undefined): PresenceStatus {
  if (lastSeenAt == null || lastSeenAt === '') return 'offline';
  const t = new Date(lastSeenAt).getTime();
  if (Number.isNaN(t)) return 'offline';
  return Date.now() - t <= LAST_SEEN_ONLINE_WINDOW_MS ? 'online' : 'offline';
}
