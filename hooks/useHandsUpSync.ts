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
          // Notify the component to update its local states (qnaOpen, presentingGroupId, etc.)
          if (onDataUpdate) {
            onDataUpdate(data);
          }
      }
    } catch(err) {
      console.error("Sync refresh failed", err);
    }
  };

  useEffect(() => {
    setQueue(initialQueue);
    setMembers(initialMembers);
  }, [initialQueue, initialMembers]);

  useEffect(() => {
    if (!sessionId) return;

    console.log(`[Supabase] Initializing WebSocket channel for session: ${sessionId}`);

    // Create a multi-table real-time channel
    const channel = supabase
      .channel(`session_sync_${sessionId}`)
      // 1. Listen to Hand Raises (status change, new raises)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'hand_raises', filter: `session_id=eq.${sessionId}` },
        (payload) => {
          console.log('[Supabase] Hand raises change detected', payload.eventType);
          refresh();
        }
      )
      // 2. Listen to Session metadata (Q&A toggle, overall session status)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'sessions', filter: `id=eq.${sessionId}` },
        (payload) => {
          console.log('[Supabase] Session metadata update detected', payload.new);
          refresh();
        }
      )
      // 3. Listen to Session Groups (Group change, Start/End report status)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'session_groups', filter: `session_id=eq.${sessionId}` },
        (payload) => {
          console.log('[Supabase] Session groups change detected', payload.eventType);
          refresh();
        }
      )
      .subscribe((status) => {
        console.log(`[Supabase] Channel status for session ${sessionId}:`, status);
      });

    return () => {
      console.log(`[Supabase] Cleaning up channel for session: ${sessionId}`);
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  return { queue, members, refresh };
}
