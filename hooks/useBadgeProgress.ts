import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { BADGE_CATALOG, BadgeStats, RING_SLOT_COUNT, getBadgeById } from '../data/badgeCatalog';

const STORAGE_KEY = (userId: string) => `mykiddy_equipped_badges_${userId}`;

function loadEquipped(userId: string): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x: unknown) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function saveEquipped(userId: string, ids: string[]) {
  localStorage.setItem(STORAGE_KEY(userId), JSON.stringify(ids.slice(0, RING_SLOT_COUNT)));
}

export function useBadgeProgress(userId: string | undefined) {
  const [stats, setStats] = useState<BadgeStats | null>(null);
  const [equippedIds, setEquippedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!userId) {
      setStats(null);
      setEquippedIds([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [lpRes, hwRes, lbRes] = await Promise.all([
        supabase.from('user_progress').select('*', { count: 'exact', head: true }).eq('user_id', userId),
        supabase.from('homework_submissions').select('*', { count: 'exact', head: true }).eq('user_id', userId),
        supabase.from('profiles').select('id, xp').order('xp', { ascending: false }).limit(200),
      ]);

      let rank: number | null = null;
      if (lbRes.data && !lbRes.error) {
        const idx = lbRes.data.findIndex((r: { id: string }) => r.id === userId);
        rank = idx >= 0 ? idx + 1 : null;
      }

      const { data: prof } = await supabase.from('profiles').select('xp, level').eq('id', userId).single();
      const xp = prof?.xp ?? 0;
      const level = prof?.level ?? Math.floor(xp / 100) + 1;

      const next: BadgeStats = {
        lessonsCompleted: lpRes.count ?? 0,
        homeworkSubmitted: hwRes.count ?? 0,
        level,
        xp,
        leaderboardRank: rank,
      };
      setStats(next);

      const equipped = loadEquipped(userId);
      const unlocked = new Set(BADGE_CATALOG.filter((b) => b.isUnlocked(next)).map((b) => b.id));
      let nextEquipped = equipped.filter((id) => unlocked.has(id)).slice(0, RING_SLOT_COUNT);
      if (nextEquipped.length === 0 && unlocked.size > 0) {
        const first = BADGE_CATALOG.find((b) => unlocked.has(b.id));
        if (first) nextEquipped = [first.id];
      }
      setEquippedIds(nextEquipped);
      if (JSON.stringify(equipped) !== JSON.stringify(nextEquipped)) {
        saveEquipped(userId, nextEquipped);
      }
    } catch {
      setStats({ lessonsCompleted: 0, homeworkSubmitted: 0, level: 1, xp: 0, leaderboardRank: null });
      setEquippedIds(loadEquipped(userId));
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { refresh(); }, [refresh]);

  const setEquipped = useCallback(
    (ids: string[]) => {
      if (!userId || !stats) return;
      const unlocked = new Set(BADGE_CATALOG.filter((b) => b.isUnlocked(stats)).map((b) => b.id));
      const clean = ids.filter((id) => unlocked.has(id) && getBadgeById(id)).slice(0, RING_SLOT_COUNT);
      setEquippedIds(clean);
      saveEquipped(userId, clean);
    },
    [userId, stats],
  );

  const unlockedIds = stats ? BADGE_CATALOG.filter((b) => b.isUnlocked(stats)).map((b) => b.id) : [];

  return { stats, loading, equippedIds, setEquipped, unlockedIds, refresh };
}
