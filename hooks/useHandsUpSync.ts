import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase/client';

export interface HandsUpQueueItem {
  id: string;
  account_id: string;
  raised_at: string;
  status: string;
}

export interface HandsUpMemberItem {
  id: string;
  name: string;
  student_no: string;
  group?: { id: string; name: string } | null;
  is_leader: boolean;
  seat_row: number | null;
  seat_col: number | null;
  hand_raised: boolean;
  hand_raise_id?: string | null;
}

export type HandsUpOverviewResponse = {
  hands_up_queue?: HandsUpQueueItem[];
  members?: HandsUpMemberItem[];
  error?: string;
  session_status?: string;
  class_name?: string;
  qna_open?: boolean;
  presenting_group_id?: string | null;
  available_groups?: Array<{ id: string; group_name: string }>;
  presenting_status?: 'N' | 'P' | 'Y';
  class_id?: string | number;
};

interface UseHandsUpSyncProps {
  sessionId: string;
  initialQueue?: HandsUpQueueItem[];
  initialMembers?: HandsUpMemberItem[];
  onDataUpdate?: (data: HandsUpOverviewResponse) => void;
}

export function useHandsUpSync({
  sessionId,
  initialQueue = [],
  initialMembers = [],
  onDataUpdate,
}: UseHandsUpSyncProps) {
  const [queue, setQueue] = useState<HandsUpQueueItem[]>(initialQueue);
  const [members, setMembers] = useState<HandsUpMemberItem[]>(initialMembers);

  // Keep a stable ref to refresh so the polling interval never goes stale
  const refreshRef = useRef<() => Promise<void>>(async () => {});

  const refresh = useCallback(async () => {
    if (!sessionId) return;

    try {
      const res = await fetch(`/api/hands-up/overview?session_id=${sessionId}`);
      const data = (await res.json()) as HandsUpOverviewResponse;

      if (data && !data.error) {
        setQueue(data.hands_up_queue ?? []);
        setMembers(data.members ?? []);
        if (onDataUpdate) onDataUpdate(data);
      }
    } catch (err: unknown) {
      console.error('[useHandsUpSync] Sync refresh failed', err);
    }
  }, [sessionId, onDataUpdate]);

  // Sync ref so polling always calls the latest refresh
  useEffect(() => {
    refreshRef.current = refresh;
  }, [refresh]);

  const startPolling = () => {
    void refresh();
  };

  // Stable polling — only tied to sessionId, not refresh, so interval never resets
  useEffect(() => {
    if (!sessionId) return;
    const pollTimer = setInterval(() => {
      void refreshRef.current();
    }, 3000);
    return () => clearInterval(pollTimer);
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId) return;

    console.log(`[useHandsUpSync] 🚀 建立 Supabase Realtime channel for ${sessionId}`);

    const channel = supabase
      .channel(`session_sync_${sessionId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'hand_raises', filter: `session_id=eq.${sessionId}` },
        () => {
          void refresh();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'session_seats', filter: `session_id=eq.${sessionId}` },
        () => {
          void refresh();
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'sessions', filter: `id=eq.${sessionId}` },
        () => {
          void refresh();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'session_groups', filter: `session_id=eq.${sessionId}` },
        () => {
          void refresh();
        }
      )
      .subscribe((status: unknown) => {
        console.log(`[useHandsUpSync] channel status for ${sessionId}:`, status);
      });

    const timer = setTimeout(() => {
      void refresh();
    }, 0);

    return () => {
      clearTimeout(timer);
      console.log(`[useHandsUpSync] 清理 Supabase channel for ${sessionId}`);
      try {
        supabase.removeChannel(channel);
      } catch {
        // ignore cleanup errors
      }
    };
  }, [sessionId, refresh]);

  return { queue, members, refresh, startPolling };
}
