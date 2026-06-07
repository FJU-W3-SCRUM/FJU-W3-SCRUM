'use client';
import { useMemo, useState } from 'react';

export interface ClassMember {
  id: string;
  name: string;
  student_no: string;
  group?: { id: string, name: string } | null;
  is_leader: boolean;
  seat_row: number | null;
  seat_col: number | null;
  hand_raised: boolean;
  hand_raise_id?: string | null;
}

interface Props {
  members: ClassMember[];
  sessionId?: string;
  currentUserAccountId?: string;
  currentUserName?: string;
  currentUserStudentNo?: string;
  canManage?: boolean;
  refresh?: () => void;
  startPolling?: () => void;
  selectionDisabled?: boolean;
}
import { useRouter } from 'next/navigation';

export default function ClassModeOverview({ members, sessionId, currentUserAccountId, currentUserName, currentUserStudentNo, canManage, refresh, startPolling, selectionDisabled }: Props) {
  const router = useRouter();
  const [flipped, setFlipped] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      return localStorage.getItem('classmode_orientation_flipped') === '1';
    } catch {
      return false;
    }
  });
  const [mirroredLR, setMirroredLR] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      return localStorage.getItem('classmode_mirror_lr') === '1';
    } catch {
      return false;
    }
  });
  const [overrides, setOverrides] = useState<Record<string, ClassMember>>({});
  const [loadingSeat, setLoadingSeat] = useState<string | null>(null);
  const [confirmSeat, setConfirmSeat] = useState<{row:number,col:number} | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const toggleFlip = () => {
    const next = !flipped;
    setFlipped(next);
    setMirroredLR(next);
    try { localStorage.setItem('classmode_orientation_flipped', next ? '1' : '0'); } catch(e){}
    try { localStorage.setItem('classmode_mirror_lr', next ? '1' : '0'); } catch(e){}
  };

  const totalCols = 10;
  const leftCols = [0,1,2];
  const middleCols = [3,4,5,6];
  const rightCols = [7,8,9];

  const { maxRow, seatMap } = useMemo(() => {
    let maxRow = 8;
    const map: Record<string, ClassMember> = {};

    members.forEach(m => {
      if (typeof m.seat_row === 'number' && typeof m.seat_col === 'number') {
        maxRow = Math.max(maxRow, m.seat_row + 1);
        map[`${m.seat_row}:${m.seat_col}`] = m;
      }
    });

    return { maxRow, seatMap: map };
  }, [members]);

  const onSeatClick = (row: number, col: number) => {
    if (!sessionId || !currentUserAccountId) return;
    if (selectionDisabled) return;
    const key = `${row}:${col}`;

    const occupant = seatMap[key];
    if (occupant && String(occupant.id) !== String(currentUserAccountId)) {
      alert('此座位已被佔用');
      return;
    }

    const myConfirmed = Object.values(seatMap).find(s => String(s.id) === String(currentUserAccountId));
    if (myConfirmed && !(myConfirmed.seat_row === row && myConfirmed.seat_col === col)) {
      alert('你已確認一個座位，若要變更請先聯絡老師或管理者');
      return;
    }

    setConfirmSeat({ row, col });
  };

  const confirmSeatSelection = async () => {
    if (!confirmSeat || !sessionId || !currentUserAccountId) return;
    if (selectionDisabled) return;
    const { row, col } = confirmSeat;
    const key = `${row}:${col}`;
    if (loadingSeat) return;

    const me = members.find(m => String(m.id) === String(currentUserAccountId));
    const myName = me?.name || currentUserName || '我';
    const myStudentNo = me?.student_no || currentUserStudentNo || '';
    const optimistic: ClassMember = me
      ? { ...me, seat_row: row, seat_col: col }
      : { id: String(currentUserAccountId || ''), name: myName, student_no: myStudentNo, is_leader: false, seat_row: row, seat_col: col, hand_raised: false };

    try {
      setLoadingSeat(key);
      setConfirmSeat(null);
      setOverrides(prev => ({ ...prev, [key]: optimistic }));

      const res = await fetch('/api/class-mode/select-seat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, row, col, actorAccountId: currentUserAccountId })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: '選位失敗' }));
        throw new Error((err as { error?: string }).error || '選位失敗');
      }

      setTimeout(() => { if (refresh) refresh(); }, 500);
      try { if (startPolling) startPolling(); } catch(e) {}
      try { router.push(`/sessions/${sessionId}?mode=class&page=3`); } catch(e) {}
      alert('座位已確認，將轉向唯讀頁面');
    } catch (e: unknown) {
      setOverrides(prev => { const copy = { ...prev }; delete copy[key]; return copy; });
      alert(e instanceof Error ? e.message : '確認座位發生錯誤');
    } finally {
      setLoadingSeat(null);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Confirmation modal */}
      {confirmSeat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl p-6 w-80 flex flex-col gap-4">
            <h3 className="text-lg font-bold text-gray-900">確認選擇座位</h3>
            <p className="text-sm text-gray-700">
              你將選擇第 <strong>{confirmSeat.row + 1}</strong> 排、第 <strong>{confirmSeat.col + 1}</strong> 個位置。
            </p>
            <p className="text-sm text-gray-500">選定後無法自行變更，確定嗎？</p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmSeat(null)}
                disabled={!!loadingSeat}
                className="px-4 py-2 rounded bg-gray-200 text-gray-700 hover:bg-gray-300 disabled:opacity-50"
              >
                取消
              </button>
              <button
                onClick={confirmSeatSelection}
                disabled={!!loadingSeat}
                className="px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 font-semibold"
              >
                {loadingSeat ? '選位中...' : '確認座位'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">🪑 上課座位表 (上課模式)</h2>
        <div className="flex items-center gap-3">
          <button onClick={toggleFlip} className="px-3 py-1 bg-gray-100 rounded">{flipped ? '鏡像: 開 (前後+左右翻轉)' : '鏡像: 關'}</button>
          <button
            onClick={async () => {
              if (refresh) {
                setRefreshing(true);
                await refresh();
                setTimeout(() => setRefreshing(false), 800);
              }
            }}
            className={`px-3 py-1 rounded transition-colors ${refreshing ? 'bg-green-100 text-green-700' : 'bg-gray-100'}`}
          >
            {refreshing ? '✓ 已更新' : '重新整理座位'}
          </button>
        </div>
      </div>

      <div className="text-sm text-gray-500">黑板在前面 — 使用「鏡像」切換可把視角旋轉 180°。</div>

      {!flipped && (
        <div className="w-full bg-[#0B5394] text-white rounded-t p-2 text-center font-bold mt-2">黑板 (Blackboard)</div>
      )}

      <div className="grid grid-cols-3 gap-4 border-t pt-3">
        <div className="col-span-3 mb-2">
          {selectionDisabled && (
            <div className="text-sm text-gray-600">已確認座位 — 目前為唯讀檢視，無法再選位。</div>
          )}
        </div>
        {(() => {
          const groupDefs = ((): { key: string; label: string; cols: number[]; width: string }[] => {
            const normal = [
              { key: 'left', label: '左側', cols: leftCols, width: 'w-1/3' },
              { key: 'middle', label: '中間', cols: middleCols, width: 'w-1/4' },
              { key: 'right', label: '右側', cols: rightCols, width: 'w-1/3' },
            ];
            if (!mirroredLR) return normal;
            return [
              { key: 'left', label: '右側', cols: [...rightCols].reverse(), width: 'w-1/3' },
              { key: 'middle', label: '中間', cols: [...middleCols].reverse(), width: 'w-1/4' },
              { key: 'right', label: '左側', cols: [...leftCols].reverse(), width: 'w-1/3' },
            ];
          })();

          return groupDefs.map((g) => (
            <div key={`group-${g.key}`}>
              <div className="text-sm font-semibold mb-2">{g.label}</div>
              <div className="flex gap-2">
                {g.cols.map((colIdx) => (
                  <div key={`${g.key}-col-${colIdx}`} className={`flex flex-col gap-2 ${g.width}`}>
                    {Array.from({ length: maxRow }).map((_, rIdx) => {
                      const r = flipped ? (maxRow - 1 - rIdx) : rIdx;
                      const c = mirroredLR ? (totalCols - 1 - colIdx) : colIdx;
                      const key = `${r}:${c}`;
                      const occupant = overrides[key] || seatMap[key];

                      return (
                        <div key={`${g.key}-${rIdx}-${colIdx}`} className="p-2 flex items-center justify-center">
                          {occupant ? (
                            <div className="relative w-full h-full border rounded p-3 bg-white text-center shadow-sm">
                              <div className="absolute top-2 right-2 w-3 h-3 rounded-full bg-green-400 ring-1 ring-white" />
                              <div className="text-sm font-medium text-gray-800">
                                {occupant.name || (String(occupant.id) === String(currentUserAccountId) ? (currentUserName || '我') : '?')}
                              </div>
                              <div className="text-xs text-gray-500">
                                {(() => {
                                  const sno = occupant.student_no || (String(occupant.id) === String(currentUserAccountId) ? currentUserStudentNo : '');
                                  return sno ? `(${sno})` : null;
                                })()}
                              </div>
                              {occupant.hand_raised && <div className="absolute bottom-2 right-2 text-sm" title="已舉手">🙋‍♂️</div>}
                            </div>
                          ) : (
                            <button
                              onClick={() => onSeatClick(r, c)}
                              disabled={!!canManage || loadingSeat === `${r}:${c}`}
                              className={`relative w-full h-full border rounded p-3 bg-gray-50 ${canManage ? 'opacity-50 cursor-not-allowed' : 'hover:bg-green-50'}`}
                              title={canManage ? '老師不可選位' : '點擊選擇座位'}
                            >
                              {loadingSeat === `${r}:${c}` ? (
                                <div className="flex flex-col items-center gap-1">
                                  <div className="w-5 h-5 rounded-full bg-gray-300 animate-pulse" />
                                  <div className="text-xs text-gray-400">選位中...</div>
                                </div>
                              ) : (
                                <div className="text-sm text-gray-600">空座</div>
                              )}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          ));
        })()}
      </div>

      {flipped && (
        <div className="w-full bg-[#0B5394] text-white rounded-b p-2 text-center font-bold mt-2">黑板 (Blackboard)</div>
      )}
    </div>
  );
}
