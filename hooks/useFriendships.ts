import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';

export type FriendshipStatus = 'pending' | 'accepted';

export interface FriendshipRow {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: FriendshipStatus;
  created_at: string;
}

export function otherPartyId(row: FriendshipRow, myId: string): string {
  return row.requester_id === myId ? row.addressee_id : row.requester_id;
}

export function useFriendships(myId: string | undefined) {
  const [rows, setRows] = useState<FriendshipRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!myId || myId === 'guest') {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('friendships')
        .select('*')
        .or(`requester_id.eq.${myId},addressee_id.eq.${myId}`)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setRows((data as FriendshipRow[]) || []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [myId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const sendRequest = useCallback(
    async (addresseeId: string) => {
      if (!myId || myId === 'guest' || addresseeId === myId) return { error: new Error('invalid') };
      const { error } = await supabase.from('friendships').insert({
        requester_id: myId,
        addressee_id: addresseeId,
        status: 'pending',
      });
      if (!error) await refresh();
      return { error };
    },
    [myId, refresh],
  );

  const accept = useCallback(
    async (friendshipId: string) => {
      const { error } = await supabase.from('friendships').update({ status: 'accepted' }).eq('id', friendshipId);
      if (!error) await refresh();
      return { error };
    },
    [refresh],
  );

  const remove = useCallback(
    async (friendshipId: string) => {
      const { error } = await supabase.from('friendships').delete().eq('id', friendshipId);
      if (!error) await refresh();
      return { error };
    },
    [refresh],
  );

  return { rows, loading, refresh, sendRequest, accept, remove };
}

export function friendshipStateForPair(
  rows: FriendshipRow[],
  myId: string,
  otherId: string,
): { row: FriendshipRow | null; label: 'friends' | 'outgoing' | 'incoming' | 'none' } {
  const row = rows.find(
    (r) =>
      (r.requester_id === myId && r.addressee_id === otherId) || (r.requester_id === otherId && r.addressee_id === myId),
  );
  if (!row) return { row: null, label: 'none' };
  if (row.status === 'accepted') return { row, label: 'friends' };
  if (row.requester_id === myId) return { row, label: 'outgoing' };
  return { row, label: 'incoming' };
}
