'use client';
import { useMemo } from 'react';

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
}

export default function ClassModeOverview({ members, sessionId, currentUserAccountId, canManage, refresh }: Props) {
  // derive grid size
  const { maxRow, maxCol, seatMap } = useMemo(() => {
    let maxRow = 5;
    let maxCol = 5;
    const map: Record<string, ClassMember> = {};

    members.forEach(m => {
      if (typeof m.seat_row === 'number' && typeof m.seat_col === 'number') {
        maxRow = Math.max(maxRow, m.seat_row + 1);
        maxCol = Math.max(maxCol, m.seat_col + 1);
        map[`${m.seat_row}:${m.seat_col}`] = m;
      }
    });

    return { maxRow, maxCol, seatMap: map };
  }, [members]);

  const handleSelectSeat = async (row: number, col: number) => {
    if (!sessionId || !currentUserAccountId) return;
    try {
      const res = await fetch('/api/class-mode/select-seat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, row, col, actorAccountId: currentUserAccountId })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: '選位失敗' }));
        throw new Error(err.error || '選位失敗');
      }

      if (refresh) refresh();
      alert('選位成功');
    } catch (e: any) {
      alert(e?.message || '選位發生錯誤');
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xl font-bold">🪑 上課座位表 (上課模式)</h2>

      <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${maxCol}, minmax(80px, 1fr))` }}>
        {Array.from({ length: maxRow }).flatMap((_, r) => 
          Array.from({ length: maxCol }).map((__, c) => {
            const key = `${r}:${c}`;
            const occupant = seatMap[key];

            return (
              <div key={key} className="p-2 flex items-center justify-center">
                {occupant ? (
                  <div className="w-full h-full border rounded p-2 bg-green-50 text-center">
                    <div className="text-sm font-medium">{occupant.name}</div>
                    <div className="text-xs text-gray-500">({occupant.student_no})</div>
                    {occupant.hand_raised && <div className="mt-1">🙋‍♂️</div>}
                  </div>
                ) : (
                  <button
                    onClick={() => handleSelectSeat(r, c)}
                    disabled={!!canManage}
                    className={`w-full h-full border rounded p-3 ${canManage ? 'opacity-50 cursor-not-allowed' : 'hover:bg-green-50'}`}
                    title={canManage ? '老師不可選位' : '點擊選擇座位'}
                  >
                    <div className="text-sm text-gray-600">空座</div>
                    <div className="text-xs text-gray-400">{`R${r+1}C${c+1}`}</div>
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
