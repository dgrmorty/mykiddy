import { getBadgeById } from '../data/badgeCatalog';
import { supabase } from './supabase';

export const PROFILE_BADGE_SLOT_COUNT = 6;

function normalizeProfileBadgeIds(ids: unknown): string[] {
  if (!Array.isArray(ids)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of ids) {
    if (typeof item !== 'string') continue;
    const id = item.trim();
    if (!id || seen.has(id)) continue;
    if (!getBadgeById(id)) continue;
    seen.add(id);
    out.push(id);
    if (out.length >= PROFILE_BADGE_SLOT_COUNT) break;
  }
  return out;
}

export async function fetchProfileBadgeIds(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('equipped_badges')
    .eq('id', userId)
    .maybeSingle();
  if (!error && data) {
    return normalizeProfileBadgeIds(data.equipped_badges);
  }
  const { data: pub, error: pubError } = await supabase.rpc('get_public_student_profile', {
    p_id: userId,
  });
  const row = Array.isArray(pub) ? pub[0] : pub;
  if (pubError || !row) {
    if (error) throw error;
    return [];
  }
  return normalizeProfileBadgeIds(row.equipped_badges);
}

export async function saveOwnProfileBadgeIds(ids: string[]): Promise<void> {
  const clean = normalizeProfileBadgeIds(ids);
  const { error } = await supabase.rpc('update_own_equipped_badges', {
    p_badge_ids: clean,
  });
  if (error) throw error;
}
