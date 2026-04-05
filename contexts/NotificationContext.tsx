import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../services/supabase';

interface NotificationContextValue {
  unreadCount: number;
  refreshUnreadCount: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

export function NotificationProvider({
  userId,
  children,
}: {
  userId: string | null | undefined;
  children: React.ReactNode;
}) {
  const [unreadCount, setUnreadCount] = useState(0);

  const refreshUnreadCount = useCallback(async () => {
    const uid = userId && userId !== 'guest' ? userId : null;
    if (!uid) {
      setUnreadCount(0);
      return;
    }
    const { count, error } = await supabase
      .from('activity_notifications')
      .select('*', { count: 'exact', head: true })
      .eq('recipient_id', uid)
      .is('read_at', null);
    if (error) {
      setUnreadCount(0);
      return;
    }
    setUnreadCount(count ?? 0);
  }, [userId]);

  useEffect(() => {
    void refreshUnreadCount();
  }, [refreshUnreadCount]);

  useEffect(() => {
    const uid = userId && userId !== 'guest' ? userId : null;
    if (!uid) return;

    const id = window.setInterval(() => {
      void refreshUnreadCount();
    }, 60_000);

    const onVis = () => {
      if (document.visibilityState === 'visible') void refreshUnreadCount();
    };
    document.addEventListener('visibilitychange', onVis);

    const channel = supabase
      .channel(`activity_notifications:${uid}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'activity_notifications',
          filter: `recipient_id=eq.${uid}`,
        },
        () => {
          void refreshUnreadCount();
        },
      )
      .subscribe();

    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
      void supabase.removeChannel(channel);
    };
  }, [userId, refreshUnreadCount]);

  const value = useMemo(
    () => ({ unreadCount, refreshUnreadCount }),
    [unreadCount, refreshUnreadCount],
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotificationSummary() {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    return { unreadCount: 0, refreshUnreadCount: async () => {} };
  }
  return ctx;
}
