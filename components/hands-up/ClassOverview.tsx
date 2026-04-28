'use client';

export interface ClassMember {
  id: string;
  name: string;
  student_no: string;
  group?: { id: string; group_name: string } | null;
  is_leader: boolean;
  seat_row: number | null;
  seat_col: number | null;
  hand_raised: boolean;
  hand_raise_id?: string | null;
  hand_raise_order?: number | null;
  [key: string]: any;
}

interface OverviewProps {
  members: ClassMember[];
  presentingGroupId?: string | null;
  onRate?: (accountId: string, handRaiseId: string) => void;
}

export default function ClassOverview({ members, presentingGroupId, onRate }: OverviewProps) {
  const seatMembers = members.filter((member) => member.seat_row !== null && member.seat_col !== null);

  const renderSeatGrid = () => {
    const rows = 7;
    const cols = 8;
    const grid = [];

    for (let y = 0; y < rows; y++) {
      const row = [];

      for (let x = 0; x < 10; x++) {
        if (x === 2 || x === 7) {
          row.push(
            <div key={`aisle-${y}-${x}`} className="w-full h-20 rounded-md bg-transparent" />
          );
        } else {
          const member = seatMembers.find((m) => Number(m.seat_row) === y && Number(m.seat_col) === x);

          row.push(
            <div
              key={`seat-${y}-${x}`}
              className={`relative w-full h-20 rounded-md flex flex-col items-center justify-center text-xs p-1 border transition-all duration-200 ${member ? 'bg-blue-600 text-white border-blue-700 shadow-md' : 'bg-gray-200 text-gray-500 border-gray-300'}`}
            >
              {member ? (
                <>
                  {member.hand_raised && (
                    <div className="absolute -top-2 -right-2 flex items-center gap-1 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-white shadow-md">
                      <span>🙋‍♂️</span>
                      <span>{member.hand_raise_order ?? 1}</span>
                    </div>
                  )}
                  <span className="font-bold truncate text-center">{member.name}</span>
                  <span className="truncate text-center">{member.student_no}</span>
                </>
              ) : (
                <span>空位</span>
              )}
            </div>
          );
        }
      }

      grid.push(
        <div key={`row-${y}`} className="grid grid-cols-10 gap-2 items-center">
          {row}
        </div>
      );
    }

    return grid;
  };

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">👥 座位與舉手狀態</h2>
      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <div className="mb-3 font-semibold text-gray-700 dark:text-gray-200">🪑 座位圖</div>
        <div className="space-y-2">
          {renderSeatGrid()}
        </div>
        <div className="mt-3 text-sm text-gray-500">已入座：{seatMembers.length} 人</div>
      </div>
    </div>
  );
}
