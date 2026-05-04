import { useCallback, useEffect } from 'react';
import { supabase } from '../services/supabase';

const HEARTBEAT_MS = 55_000;

/**
 * Периодически обновляет profiles.last_seen_at для текущего пользователя,
 * чтобы другие видели зелёный индикатор в каталоге учеников.
 */
export function useProfileLastSeenHeartbeat(userId: string | undefined, enabled: boolean) {
  const pulse = useCallback(async () => {
    try {
      const { error } = await supabase.rpc('touch_profile_last_seen');
      if (error) console.warn('[presence] touch_profile_last_seen', error.message);
    } catch (e) {
      console.warn('[presence] touch_profile_last_seen', e);
    }
  }, []);

  useEffect(() => {
    if (!enabled || !userId || userId === 'guest') return;

    void pulse();
    const id = window.setInterval(() => void pulse(), HEARTBEAT_MS);
    const onVis = () => {
      if (document.visibilityState === 'visible') void pulse();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [enabled, userId, pulse]);
}
