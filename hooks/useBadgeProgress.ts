import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../services/supabase';
import {
  fetchProfileBadgeIds,
  PROFILE_BADGE_SLOT_COUNT,
  saveOwnProfileBadgeIds,
} from '../services/profileBadgeService';
import { BADGE_CATALOG, BadgeStats, getBadgeById } from '../data/badgeCatalog';
import { levelFromXp } from '../progression';
import { badgeEquipStorageKey, purgeLegacyEquippedBadgeKeys } from '../utils/badgeStorage';

function loadLegacyEquipped(userId: string): string[] {
  try {
    const raw = localStorage.getItem(badgeEquipStorageKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x: unknown) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function clearLegacyEquipped(userId: string): void {
  try {
    localStorage.removeItem(badgeEquipStorageKey(userId));
  } catch {
    /* ignore */
  }
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

function filterEquippedForDisplay(ids: string[], stats: BadgeStats): string[] {
  const unlocked = new Set(BADGE_CATALOG.filter((b) => b.isUnlocked(stats)).map((b) => b.id));
  const out: string[] = [];
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id) || !unlocked.has(id) || !getBadgeById(id)) continue;
    seen.add(id);
    out.push(id);
    if (out.length >= PROFILE_BADGE_SLOT_COUNT) break;
  }
  return out;
}

export interface UseBadgeProgressOptions {
  /** Чужой профиль: не пишем localStorage, слоты — значения с сервера */
  publicView?: boolean;
}

export function useBadgeProgress(userId: string | undefined, options?: UseBadgeProgressOptions) {
  const publicView = options?.publicView === true;
  const [stats, setStats] = useState<BadgeStats | null>(null);
  const [equippedIds, setEquippedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const didPurgeLegacy = useRef(false);
  const equippedIdsRef = useRef<string[]>([]);
  const saveInFlightRef = useRef(0);
  const saveEpochRef = useRef(0);

  equippedIdsRef.current = equippedIds;

  const snapshotIsStale = (epochAtFetch: number) =>
    saveInFlightRef.current > 0 || saveEpochRef.current !== epochAtFetch;

  const beginGuardedWrite = () => {
    saveEpochRef.current += 1;
    saveInFlightRef.current += 1;
  };

  const endGuardedWrite = () => {
    saveInFlightRef.current = Math.max(0, saveInFlightRef.current - 1);
  };

  const refresh = useCallback(async () => {
    if (!userId) {
      setStats(null);
      setEquippedIds([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      if (!publicView && !didPurgeLegacy.current) {
        didPurgeLegacy.current = true;
        purgeLegacyEquippedBadgeKeys();
      }

      const [lpRes, hwRes, profRes] = await Promise.all([
        supabase.from('user_progress').select('*', { count: 'exact', head: true }).eq('user_id', userId),
        supabase.from('homework_submissions').select('*', { count: 'exact', head: true }).eq('user_id', userId),
        supabase.from('profiles').select('xp, level').eq('id', userId).maybeSingle(),
      ]);

      let xp = profRes.data?.xp ?? 0;
      if (profRes.error || !profRes.data) {
        const { data: pub } = await supabase.rpc('get_public_student_profile', { p_id: userId });
        const row = Array.isArray(pub) ? pub[0] : pub;
        xp = row?.xp ?? 0;
      }

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

      const epochAtFetch = saveEpochRef.current;
      let serverIds: string[] | null = null;
      try {
        serverIds = await fetchProfileBadgeIds(userId);
      } catch {
        serverIds = null;
      }

      if (snapshotIsStale(epochAtFetch)) {
        return;
      }

      if (serverIds === null) {
        return;
      }

      if (publicView) {
        setEquippedIds(filterEquippedForDisplay(serverIds, next));
        return;
      }

      if (serverIds.length > 0) {
        setEquippedIds(filterEquippedForDisplay(serverIds, next));
        clearLegacyEquipped(userId);
        return;
      }

      const legacy = filterEquippedForDisplay(loadLegacyEquipped(userId), next);
      if (legacy.length === 0) {
        if (snapshotIsStale(epochAtFetch)) {
          return;
        }
        setEquippedIds([]);
        return;
      }

      if (snapshotIsStale(epochAtFetch)) {
        return;
      }

      beginGuardedWrite();
      setEquippedIds(legacy);
      try {
        await saveOwnProfileBadgeIds(legacy);
        clearLegacyEquipped(userId);
      } catch {
        /* keep legacy key for a later retry; successful or optimistic seed stays displayed */
      } finally {
        endGuardedWrite();
      }
    } catch {
      setStats({
        lessonsCompleted: 0,
        homeworkSubmitted: 0,
        aiTutorPromptsTotal: 0,
        level: 1,
        xp: 0,
        leaderboardRank: null,
      });
    } finally {
      setLoading(false);
    }
  }, [userId, publicView]);

  useEffect(() => { refresh(); }, [refresh]);

  const setEquipped = useCallback(
    async (ids: string[]): Promise<void> => {
      if (!userId || !stats || publicView) return;
      const previous = equippedIdsRef.current;
      const clean = filterEquippedForDisplay(ids, stats);
      beginGuardedWrite();
      setEquippedIds(clean);
      try {
        await saveOwnProfileBadgeIds(clean);
      } catch (err) {
        setEquippedIds(previous);
        throw err;
      } finally {
        endGuardedWrite();
      }
    },
    [userId, stats, publicView],
  );

  const unlockedIds = stats ? BADGE_CATALOG.filter((b) => b.isUnlocked(stats)).map((b) => b.id) : [];

  return { stats, loading, equippedIds, setEquipped, unlockedIds, refresh };
}
