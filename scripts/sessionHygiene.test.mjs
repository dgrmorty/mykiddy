import assert from 'node:assert/strict';
import {
  shouldPurgeStoredAuthValue,
  isAuthApiUrl,
  fetchTimeoutMsForUrl,
  isCorruptAuthError,
} from '../services/sessionHygiene.ts';

const now = Date.parse('2026-09-08T12:00:00Z');
const hourAgo = Math.floor((now - 3600_000) / 1000);
const inAnHour = Math.floor((now + 3600_000) / 1000);

const withRefresh = JSON.stringify({
  access_token: 'aaa',
  refresh_token: 'refresh-token-value',
  expires_at: hourAgo,
});
assert.equal(
  shouldPurgeStoredAuthValue(withRefresh, now),
  false,
  'expired access token must not drop a refresh token',
);

const nested = JSON.stringify({
  currentSession: { refresh_token: 'nested-refresh', expires_at: hourAgo },
});
assert.equal(shouldPurgeStoredAuthValue(nested, now), false);

assert.equal(shouldPurgeStoredAuthValue('not-json', now), true);
assert.equal(shouldPurgeStoredAuthValue(JSON.stringify({ expires_at: hourAgo }), now), true);
assert.equal(
  shouldPurgeStoredAuthValue(JSON.stringify({ refresh_token: 'r', expires_at: inAnHour }), now),
  false,
);

assert.equal(isAuthApiUrl('https://x.supabase.co/auth/v1/token?grant_type=refresh_token'), true);
assert.equal(fetchTimeoutMsForUrl('https://x.supabase.co/auth/v1/user', 8000), 20000);
assert.equal(fetchTimeoutMsForUrl('https://x.supabase.co/rest/v1/courses', 8000), 8000);

assert.equal(isCorruptAuthError({ code: 'PGRST301', message: 'JWT expired' }), true);
assert.equal(isCorruptAuthError({ message: 'JWT expired' }), true);
assert.equal(isCorruptAuthError({ code: '401', message: 'permission denied for function is_admin_user' }), false);
assert.equal(isCorruptAuthError({ message: 'Timeout' }), false);

console.log('sessionHygiene tests ok');
