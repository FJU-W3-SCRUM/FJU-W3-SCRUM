import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';

interface UseHandsUpSyncProps {
  sessionId: string;
  initialQueue?: any[];
  initialMembers?: any[];
  onDataUpdate?: (data: any) => void;
}

export function useHandsUpSync({ sessionId, initialQueue = [], initialMembers = [], onDataUpdate }: UseHandsUpSyncProps) {
  const [queue, setQueue] = useState<any[]>(initialQueue);
  const [members, setMembers] = useState<any[]>(initialMembers);

  const refresh = async () => {
    if (!sessionId) return;
    try {
      const res = await fetch(`/api/hands-up/overview?session_id=${sessionId}`);
      const data = await res.json();
      if (data && !data.error) {
          setQueue(data.hands_up_queue || []);
          setMembers(data.members || []);
          if (onDataUpdate) onDataUpdate(data);
      }
    } catch(err) {
      console.error("[useHandsUpSync] Sync refresh failed", err);
    }
  };

  // startPolling kept for backward compatibility (now just triggers one refresh)
  const startPolling = () => {
    refresh();
  };

  useEffect(() => {
    setQueue(initialQueue);
    setMembers(initialMembers);
  }, [initialQueue, initialMembers]);

  useEffect(() => {
    if (!sessionId) return;

    console.log(`[useHandsUpSync] 🚀 建立 Supabase Realtime channel for ${sessionId}`);

    const channel = supabase
      .channel(`session_sync_${sessionId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'hand_raises', filter: `session_id=eq.${sessionId}` },
        () => { refresh(); }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'session_seats', filter: `session_id=eq.${sessionId}` },
        () => { refresh(); }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'sessions', filter: `id=eq.${sessionId}` },
        () => { refresh(); }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'session_groups', filter: `session_id=eq.${sessionId}` },
        () => { refresh(); }
      )
      .subscribe((status) => {
        console.log(`[useHandsUpSync] channel status for ${sessionId}:`, status);
      });

    // initial fetch
    refresh();

    return () => {
      console.log(`[useHandsUpSync] 清理 Supabase channel for ${sessionId}`);
      try { supabase.removeChannel(channel); } catch(e) {}
    };
  }, [sessionId]);

  return { queue, members, refresh, startPolling };
}
