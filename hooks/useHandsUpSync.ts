import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase/client';

// Realtime sync configuration - AGGRESSIVE 確保跨瀏覽器同步
const POLLING_INTERVAL = 500; // ms - 主動輪詢間隔
const POLLING_TIMEOUT = 5000; // ms - 主動輪詢持續時間

interface UseHandsUpSyncProps {
  sessionId: string;
  initialQueue?: any[];
  initialMembers?: any[];
  onDataUpdate?: (data: any) => void;
}

export function useHandsUpSync({ sessionId, initialQueue = [], initialMembers = [], onDataUpdate }: UseHandsUpSyncProps) {
  const [queue, setQueue] = useState<any[]>(initialQueue);
  const [members, setMembers] = useState<any[]>(initialMembers);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const aggressivePollingEndTimeRef = useRef<number>(0);

  const refresh = async () => {
    if (!sessionId) return;
    try {
      console.log('[useHandsUpSync] Calling refresh() to sync data...');
      const res = await fetch(`/api/hands-up/overview?session_id=${sessionId}`);
      const data = await res.json();
      if (data && !data.error) {
          setQueue(data.hands_up_queue || []);
          setMembers(data.members || []);
          // Notify the component to update its local states (qnaOpen, presentingGroupId, etc.)
          if (onDataUpdate) {
            onDataUpdate(data);
          }
      } else {
        console.error('[useHandsUpSync] API error:', data?.error);
      }
    } catch(err) {
      console.error("[useHandsUpSync] Sync refresh failed", err);
    }
  };

  // 啟動主動輪詢 - 強制每 500ms 刷新一次，持續 5 秒
  // 這確保即使 WebSocket 失效，跨瀏覽器仍能同步
  const startPolling = () => {
    console.log('[useHandsUpSync] 🔄 啟動主動輪詢 (5秒內每500ms一次)');
    aggressivePollingEndTimeRef.current = Date.now() + POLLING_TIMEOUT;
    
    // 立即執行一次
    refresh();
  };

  useEffect(() => {
    setQueue(initialQueue);
    setMembers(initialMembers);
  }, [initialQueue, initialMembers]);

  useEffect(() => {
    if (!sessionId) return;

    console.log(`[useHandsUpSync] 🚀 初始化會話同步 for ${sessionId}`);

    // **MAIN POLLING LOOP** - 不依賴任何 state，直接計時
    // 這確保輪詢一直保持運行，直到 component 卸載
    const pollingInterval = setInterval(() => {
      const now = Date.now();
      
      // 如果在激進輪詢時間窗口內，執行刷新
      if (now < aggressivePollingEndTimeRef.current) {
        console.log(`[useHandsUpSync] ⏱️ 激進輪詢 (${POLLING_INTERVAL}ms)...`);
        refresh();
      }
    }, POLLING_INTERVAL);

    console.log(`[useHandsUpSync] WebSocket 監聽已啟動 (用於備用)`);

    return () => {
      console.log(`[useHandsUpSync] 清理會話同步 for ${sessionId}`);
      clearInterval(pollingInterval);
    };
  }, [sessionId]);

  return { queue, members, refresh, startPolling };
}
