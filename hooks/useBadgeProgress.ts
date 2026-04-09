import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../services/supabase';
import { BADGE_CATALOG, BadgeStats, RING_SLOT_COUNT, getBadgeById } from '../data/badgeCatalog';
import { levelFromXp } from '../progression';
import { badgeEquipStorageKey, purgeLegacyEquippedBadgeKeys } from '../utils/badgeStorage';

function loadEquipped(userId: string): string[] {
  try {
    const raw = localStorage.getItem(badgeEquipStorageKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x: unknown) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function saveEquipped(userId: string, ids: string[]) {
  localStorage.setItem(badgeEquipStorageKey(userId), JSON.stringify(ids.slice(0, RING_SLOT_COUNT)));
}

async function resolveLeaderboardRank(userId: string, xp: number): Promise<number | null> {
  const { data, error } = await supabase.rpc('profile_xp_rank', { target: userId });
  const r = typeof data === 'number' ? data : typeof data === 'string' ? Number(data) : NaN;
  if (!error && Number.isFinite(r) && r >= 1) {
    return Math.floor(r);
  }
  const { count, error: cErr } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .gt('xp', xp);
  if (cErr) return null;
  return (count ?? 0) + 1;
}

function defaultEquippedFromUnlocked(unlocked: Set<string>): string[] {
  return BADGE_CATALOG.filter((b) => unlocked.has(b.id))
    .map((b) => b.id)
    .slice(0, RING_SLOT_COUNT);
}

export interface UseBadgeProgressOptions {
  /** Чужой профиль: не пишем localStorage, «кольцо» — первые разблокированные из каталога */
  publicView?: boolean;
}

export function useBadgeProgress(userId: string | undefined, options?: UseBadgeProgressOptions) {
  const publicView = options?.publicView === true;
  const [stats, setStats] = useState<BadgeStats | null>(null);
  const [equippedIds, setEquippedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const didPurgeLegacy = useRef(false);

  const refresh = useCallback(async () => {
    if (!userId) {
      setStats(null);
      setEquippedIds([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      if (!didPurgeLegacy.current) {
        didPurgeLegacy.current = true;
        purgeLegacyEquippedBadgeKeys();
      }

      const [lpRes, hwRes, profRes] = await Promise.all([
        supabase.from('user_progress').select('*', { count: 'exact', head: true }).eq('user_id', userId),
        supabase.from('homework_submissions').select('*', { count: 'exact', head: true }).eq('user_id', userId),
        supabase.from('profiles').select('xp, level').eq('id', userId).single(),
      ]);

      const xp = profRes.data?.xp ?? 0;

      let aiTotal = 0;
      try {
        const aiRes = await supabase.from('ai_usage').select('tutor_count').eq('user_id', userId);
        if (aiRes.data) {
          aiTotal = aiRes.data.reduce((acc, row: { tutor_count?: number }) => acc + (row.tutor_count ?? 0), 0);
        }
      } catch {
        /* нет таблицы / RLS */
      }

      const rank = await resolveLeaderboardRank(userId, xp);
      const level = levelFromXp(xp);

      const next: BadgeStats = {
        lessonsCompleted: lpRes.count ?? 0,
        homeworkSubmitted: hwRes.count ?? 0,
        aiTutorPromptsTotal: aiTotal,
        level,
        xp,
        leaderboardRank: rank,
      };
      setStats(next);

      const unlocked = new Set(BADGE_CATALOG.filter((b) => b.isUnlocked(next)).map((b) => b.id));
      let nextEquipped: string[];

      if (publicView) {
        nextEquipped = defaultEquippedFromUnlocked(unlocked);
      } else {
        const equipped = loadEquipped(userId);
        nextEquipped = equipped.filter((id) => unlocked.has(id)).slice(0, RING_SLOT_COUNT);
        if (nextEquipped.length === 0 && unlocked.size > 0) {
          nextEquipped = defaultEquippedFromUnlocked(unlocked);
        }
        if (JSON.stringify(equipped) !== JSON.stringify(nextEquipped)) {
          saveEquipped(userId, nextEquipped);
        }
      }
      setEquippedIds(nextEquipped);
    } catch {
      setStats({
        lessonsCompleted: 0,
        homeworkSubmitted: 0,
        aiTutorPromptsTotal: 0,
        level: 1,
        xp: 0,
        leaderboardRank: null,
      });
      setEquippedIds(publicView ? [] : loadEquipped(userId));
    } finally {
      setLoading(false);
    }
  }, [userId, publicView]);

  useEffect(() => { refresh(); }, [refresh]);

  const setEquipped = useCallback(
    (ids: string[]) => {
      if (!userId || !stats || publicView) return;
      const unlocked = new Set(BADGE_CATALOG.filter((b) => b.isUnlocked(stats)).map((b) => b.id));
      const clean = ids.filter((id) => unlocked.has(id) && getBadgeById(id)).slice(0, RING_SLOT_COUNT);
      setEquippedIds(clean);
      saveEquipped(userId, clean);
    },
    [userId, stats, publicView],
  );

  const unlockedIds = stats ? BADGE_CATALOG.filter((b) => b.isUnlocked(stats)).map((b) => b.id) : [];

  return { stats, loading, equippedIds, setEquipped, unlockedIds, refresh };
}
