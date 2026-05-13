'use client';
import { useMemo, useState, useEffect } from 'react';

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
  canManage?: boolean;
  refresh?: () => void;
  selectionDisabled?: boolean;
}
import { useRouter } from 'next/navigation';

export default function ClassModeOverview({ members, sessionId, currentUserAccountId, canManage, refresh }: Props) {
  const router = useRouter();
  const { selectionDisabled } = arguments[0] as Props;
  const [flipped, setFlipped] = useState<boolean>(false);
  const [overrides, setOverrides] = useState<Record<string, ClassMember>>({});
  const [loadingSeat, setLoadingSeat] = useState<string | null>(null);
  const [tentativeSeat, setTentativeSeat] = useState<{row:number,col:number} | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('classmode_orientation_flipped');
      setFlipped(saved === '1');
    } catch (e) {}
  }, []);

  const toggleFlip = () => {
    const next = !flipped;
    setFlipped(next);
    try { localStorage.setItem('classmode_orientation_flipped', next ? '1' : '0'); } catch(e){}
  };

  // derive grid size
  // fixed 3-4-3 layout => total 10 columns
  const totalCols = 10;
  const leftCols = [0,1,2];
  const middleCols = [3,4,5,6];
  const rightCols = [7,8,9];

  const { maxRow, seatMap } = useMemo(() => {
    let maxRow = 5;
    const map: Record<string, ClassMember> = {};

    members.forEach(m => {
      if (typeof m.seat_row === 'number' && typeof m.seat_col === 'number') {
        maxRow = Math.max(maxRow, m.seat_row + 1);
        map[`${m.seat_row}:${m.seat_col}`] = m;
      }
    });

    return { maxRow, seatMap: map };
  }, [members]);

  // click to select tentative seat (client-side only)
  const onSeatClick = (row: number, col: number) => {
    if (!sessionId || !currentUserAccountId) return;
    if (selectionDisabled) return; // don't allow tentative when selection disabled
    const key = `${row}:${col}`;

    // If seat is occupied by someone else, do nothing
    const occupant = seatMap[key];
    if (occupant && String(occupant.id) !== String(currentUserAccountId)) {
      alert('此座位已被佔用');
      return;
    }

    // If user already has a confirmed seat, disallow selecting another
    const myConfirmed = Object.values(seatMap).find(s => String(s.id) === String(currentUserAccountId));
    if (myConfirmed && !(myConfirmed.seat_row === row && myConfirmed.seat_col === col)) {
      alert('你已確認一個座位，若要變更請先聯絡老師或管理者');
      return;
    }

    // toggle tentative
    setTentativeSeat(prev => {
      if (prev && prev.row === row && prev.col === col) return null;
      return { row, col };
    });
  };

  const confirmTentativeSeat = async () => {
    if (!tentativeSeat || !sessionId || !currentUserAccountId) return;
    if (selectionDisabled) return;
    const { row, col } = tentativeSeat;
    const key = `${row}:${col}`;
    if (loadingSeat) return;

    const me = members.find(m => String(m.id) === String(currentUserAccountId));
    const optimistic: ClassMember = me ? { ...me, seat_row: row, seat_col: col } : { id: String(currentUserAccountId || ''), name: '我', student_no: '', is_leader: false, seat_row: row, seat_col: col, hand_raised: false };

    try {
      setLoadingSeat(key);
      setOverrides(prev => ({ ...prev, [key]: optimistic }));

      const res = await fetch('/api/class-mode/select-seat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, row, col, actorAccountId: currentUserAccountId })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: '選位失敗' }));
        throw new Error(err.error || '選位失敗');
      }

      // confirmed — clear tentative and refresh after short delay
      setTentativeSeat(null);
      setTimeout(() => { if (refresh) refresh(); }, 500);
      // redirect to page 3 (read-only view)
      try { router.push(`/sessions/${sessionId}?mode=class&page=3`); } catch(e) {}
      alert('座位已確認，將轉向唯讀頁面');
    } catch (e: any) {
      setOverrides(prev => { const copy = { ...prev }; delete copy[key]; return copy; });
      alert(e?.message || '確認座位發生錯誤');
    } finally {
      setLoadingSeat(null);
    }
  };

  const cancelTentativeSeat = () => setTentativeSeat(null);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">🪑 上課座位表 (上課模式)</h2>
          <div className="flex items-center gap-3">
          <button onClick={toggleFlip} className="px-3 py-1 bg-gray-100 rounded">{flipped ? '鏡像: 開 (前後翻轉)' : '鏡像: 關'}</button>
          <button onClick={() => refresh && refresh()} className="px-3 py-1 bg-gray-100 rounded">重新整理座位</button>
          {tentativeSeat && (
            <div className="flex items-center gap-2 ml-3">
              <div className="text-sm">暫存選位: R{tentativeSeat.row+1} C{tentativeSeat.col+1}</div>
              <button onClick={confirmTentativeSeat} disabled={!!loadingSeat} className="px-3 py-1 bg-green-600 text-white rounded">確認座位</button>
              <button onClick={cancelTentativeSeat} disabled={!!loadingSeat} className="px-3 py-1 bg-gray-200 rounded">取消</button>
            </div>
          )}
        </div>
      </div>

      <div className="text-sm text-gray-500">黑板在前面 — 使用「鏡像」切換可把視角旋轉 180°。</div>

          {/* Blackboard position: top when not flipped, bottom when flipped */}
          {!flipped && (
            <div className="w-full bg-[#0B5394] text-white rounded-t p-2 text-center font-bold mt-2">黑板 (Blackboard)</div>
          )}

          <div className="grid grid-cols-3 gap-4 border-t pt-3">
            {/* confirmation controls above seat table */}
            <div className="col-span-3 mb-2">
              {tentativeSeat && !selectionDisabled && (
                <div className="flex items-center gap-3">
                  <div className="text-sm">暫存選位: R{tentativeSeat.row+1} C{tentativeSeat.col+1}</div>
                  <button onClick={confirmTentativeSeat} disabled={!!loadingSeat} className="px-3 py-1 bg-green-600 text-white rounded">確認座位</button>
                  <button onClick={cancelTentativeSeat} disabled={!!loadingSeat} className="px-3 py-1 bg-gray-200 rounded">取消暫存</button>
                </div>
              )}
              {selectionDisabled && (
                <div className="text-sm text-gray-600">已確認座位 — 目前為唯讀檢視，無法再選位。</div>
              )}
            </div>
        {/* left group */}
        <div>
          <div className="text-sm font-semibold mb-2">左側</div>
          <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${leftCols.length}, minmax(64px, 1fr))` }}>
            {Array.from({ length: maxRow }).flatMap((_, rIdx) =>
              leftCols.map((colIdx) => {
                const r = flipped ? (maxRow - 1 - rIdx) : rIdx;
                const c = colIdx;
                const key = `${r}:${c}`;
                const occupant = overrides[key] || seatMap[key];
                // hide seat R4C1 (row index 3, col index 0)
                if (r === 3 && c === 0) {
                  return (
                    <div key={`L-${rIdx}-${colIdx}`} className="p-2 flex items-center justify-center" />
                  );
                }
                const isTentative = tentativeSeat && tentativeSeat.row === r && tentativeSeat.col === c;

                return (
                  <div key={`L-${rIdx}-${colIdx}`} className="p-2 flex items-center justify-center">
                    {occupant || isTentative ? (
                      <div className="relative w-full h-full border rounded p-3 bg-white text-center shadow-sm">
                        <div className="absolute top-2 right-2 w-3 h-3 rounded-full bg-green-400 ring-1 ring-white" />
                        <div className="text-sm font-medium text-gray-800">{(isTentative && !occupant) ? (members.find(m=>String(m.id)===String(currentUserAccountId))?.name || '我') : occupant.name}</div>
                        <div className="text-xs text-gray-500">({(isTentative && !occupant) ? (members.find(m=>String(m.id)===String(currentUserAccountId))?.student_no || '') : occupant.student_no})</div>
                        { (isTentative && !occupant) && <div className="absolute bottom-2 right-2 text-xs text-green-700 font-semibold">暫存</div> }
                        {(occupant && occupant.hand_raised) && <div className="absolute bottom-2 right-2 text-sm" title="已舉手">🙋‍♂️</div>}
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
                          <>
                            <div className="text-sm text-gray-600">空座</div>
                            <div className="text-xs text-gray-400">{`R${r+1}C${c+1}`}</div>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* middle group */}
        <div>
          <div className="text-sm font-semibold mb-2">中間</div>
          <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${middleCols.length}, minmax(64px, 1fr))` }}>
            {Array.from({ length: maxRow }).flatMap((_, rIdx) =>
              middleCols.map((colIdx) => {
                const r = flipped ? (maxRow - 1 - rIdx) : rIdx;
                const c = colIdx;
                const key = `${r}:${c}`;
                const occupant = overrides[key] || seatMap[key];
                const isTentative = tentativeSeat && tentativeSeat.row === r && tentativeSeat.col === c;

                return (
                  <div key={`M-${rIdx}-${colIdx}`} className="p-2 flex items-center justify-center">
                    {occupant || isTentative ? (
                      <div className="relative w-full h-full border rounded p-3 bg-white text-center shadow-sm">
                        <div className="absolute top-2 right-2 w-3 h-3 rounded-full bg-green-400 ring-1 ring-white" />
                        <div className="text-sm font-medium text-gray-800">{(isTentative && !occupant) ? (members.find(m=>String(m.id)===String(currentUserAccountId))?.name || '我') : occupant.name}</div>
                        <div className="text-xs text-gray-500">({(isTentative && !occupant) ? (members.find(m=>String(m.id)===String(currentUserAccountId))?.student_no || '') : occupant.student_no})</div>
                        { (isTentative && !occupant) && <div className="absolute bottom-2 right-2 text-xs text-green-700 font-semibold">暫存</div> }
                        {(occupant && occupant.hand_raised) && <div className="absolute bottom-2 right-2 text-sm" title="已舉手">🙋‍♂️</div>}
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
                          <>
                            <div className="text-sm text-gray-600">空座</div>
                            <div className="text-xs text-gray-400">{`R${r+1}C${c+1}`}</div>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* right group */}
        <div>
          <div className="text-sm font-semibold mb-2">右側</div>
          <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${rightCols.length}, minmax(64px, 1fr))` }}>
            {Array.from({ length: maxRow }).flatMap((_, rIdx) =>
              rightCols.map((colIdx) => {
                const r = flipped ? (maxRow - 1 - rIdx) : rIdx;
                const c = colIdx;
                const key = `${r}:${c}`;
                const occupant = overrides[key] || seatMap[key];
                const isTentative = tentativeSeat && tentativeSeat.row === r && tentativeSeat.col === c;

                return (
                  <div key={`R-${rIdx}-${colIdx}`} className="p-2 flex items-center justify-center">
                    {occupant || isTentative ? (
                      <div className="relative w-full h-full border rounded p-3 bg-white text-center shadow-sm">
                        <div className="absolute top-2 right-2 w-3 h-3 rounded-full bg-green-400 ring-1 ring-white" />
                        <div className="text-sm font-medium text-gray-800">{(isTentative && !occupant) ? (members.find(m=>String(m.id)===String(currentUserAccountId))?.name || '我') : occupant.name}</div>
                        <div className="text-xs text-gray-500">({(isTentative && !occupant) ? (members.find(m=>String(m.id)===String(currentUserAccountId))?.student_no || '') : occupant.student_no})</div>
                        { (isTentative && !occupant) && <div className="absolute bottom-2 right-2 text-xs text-green-700 font-semibold">暫存</div> }
                        {(occupant && occupant.hand_raised) && <div className="absolute bottom-2 right-2 text-sm" title="已舉手">🙋‍♂️</div>}
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
                          <>
                            <div className="text-sm text-gray-600">空座</div>
                            <div className="text-xs text-gray-400">{`R${r+1}C${c+1}`}</div>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {flipped && (
        <div className="w-full bg-[#0B5394] text-white rounded-b p-2 text-center font-bold mt-2">黑板 (Blackboard)</div>
      )}
    </div>
  );
}
