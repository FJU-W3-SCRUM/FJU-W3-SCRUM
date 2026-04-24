import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';

interface UseHandsUpSyncProps {
  sessionId: string;
  initialQueue?: any[];
  initialMembers?: any[];
}

export function useHandsUpSync({ sessionId, initialQueue = [], initialMembers = [] }: UseHandsUpSyncProps) {
  const [queue, setQueue] = useState<any[]>(initialQueue);
  const [members, setMembers] = useState<any[]>(initialMembers);

  useEffect(() => {
    // If we loaded them later
    setQueue(initialQueue);
    setMembers(initialMembers);
  }, [initialQueue, initialMembers]);

  useEffect(() => {
    if (!sessionId) return;

    // Subscribe to changes strictly affecting our session
    const channel = supabase
      .channel(`hand_raises_session_${sessionId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'hand_raises', filter: `session_id=eq.${sessionId}` },
        (payload) => {
          // Because real-time updates don't easily tell us full data on all fronts,
          // we force a re-fetch of the overview endpoint or manually patch our local state
          
          try {
             fetch(`/api/hands-up/overview?session_id=${sessionId}`)
              .then(res => res.json())
              .then(data => {
                if (data && !data.error) {
                    setQueue(data.hands_up_queue || []);
                    setMembers(data.members || []);
                }
              }).catch(err => console.error("Could not fetch new state", err));
          } catch(e) {
             console.error("Failed handling realtime event", e);
          }
        }
      )
      .subscribe();

    return () => {
      // Clean up the subscription
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  return { queue, members };
}