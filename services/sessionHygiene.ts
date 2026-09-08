/** Pure session-storage helpers — no browser globals, so we can unit-test them. */

type StoredAuthPayload = {
  expires_at?: number;
  refresh_token?: string;
  currentSession?: {
    expires_at?: number;
    refresh_token?: string;
  };
};

function readRefreshToken(parsed: StoredAuthPayload): string {
  const nested = parsed.currentSession?.refresh_token;
  const top = parsed.refresh_token;
  return typeof nested === 'string' && nested.length > 0
    ? nested
    : typeof top === 'string'
      ? top
      : '';
}

/** Access token lifetime is ~1h. A refresh_token must survive that, or the next page load logs the user out. */
export function shouldPurgeStoredAuthValue(raw: string, now = Date.now()): boolean {
  try {
    const parsed = JSON.parse(raw) as StoredAuthPayload;
    if (readRefreshToken(parsed).length > 0) return false;
    const expiresAt = Number(parsed.expires_at ?? parsed.currentSession?.expires_at);
    if (!Number.isFinite(expiresAt)) return true;
    return expiresAt * 1000 < now - 5000;
  } catch {
    return true;
  }
}

export function isAuthApiUrl(url: string): boolean {
  return /\/auth\/v1\//i.test(url);
}

export function fetchTimeoutMsForUrl(url: string, defaultMs: number, authMs = 60000): number {
  return isAuthApiUrl(url) ? authMs : defaultMs;
}

export function isCorruptAuthError(err: unknown): boolean {
  const msg = String(
    (err as { message?: string })?.message ||
      (err as { error_description?: string })?.error_description ||
      err ||
      '',
  ).toLowerCase();
  const code = String((err as { code?: string })?.code || '').toLowerCase();
  return (
    code === 'pgrst301' ||
    msg.includes('jwt expired') ||
    msg.includes('invalid jwt') ||
    msg.includes('invalid claim') ||
    msg.includes('no suitable key') ||
    msg.includes('refresh token not found') ||
    (msg.includes('refresh token') && msg.includes('invalid')) ||
    msg.includes('session from session_id claim') ||
    msg.includes('auth session missing')
  );
}
