/** Достать id ролика из youtube.com / youtu.be / shorts / embed. */

export function parseYoutubeVideoId(url: string | null | undefined): string | null {
  if (!url || typeof url !== 'string') return null;
  const raw = url.trim();
  if (!raw) return null;
  try {
    const u = new URL(raw);
    const host = u.hostname.replace(/^www\./, '').toLowerCase();
    if (host === 'youtu.be') {
      const id = u.pathname.split('/').filter(Boolean)[0] || '';
      return id.length >= 11 ? id.slice(0, 11) : null;
    }
    if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtube-nocookie.com') {
      const v = u.searchParams.get('v');
      if (v && v.length >= 11) return v.slice(0, 11);
      const parts = u.pathname.split('/').filter(Boolean);
      const labeled = ['embed', 'shorts', 'live', 'v'];
      for (const label of labeled) {
        const i = parts.indexOf(label);
        if (i >= 0 && parts[i + 1] && parts[i + 1].length >= 11) return parts[i + 1].slice(0, 11);
      }
    }
  } catch {
    return null;
  }
  return null;
}

export function isYoutubeLessonVideo(url?: string | null): boolean {
  return parseYoutubeVideoId(url) != null;
}
