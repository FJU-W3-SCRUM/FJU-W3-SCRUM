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

interface OverviewProps {
  members: ClassMember[];
  presentingGroupId?: string | null;
  onRate?: (accountId: string, handRaiseId: string) => void;
}

export default function ClassOverview({ members, presentingGroupId, onRate }: OverviewProps) {
  // Grouping members by `group.id` and sorting
  const groupedMembers = useMemo(() => {
    const grouped: Record<string, { id: string, name: string, members: ClassMember[] }> = {};
    
    // Fallback for students without group
    grouped['ungrouped'] = { id: 'ungrouped', name: '未分組 (Ungrouped)', members: [] };

    members.forEach(m => {
      const gId = m.group?.id || 'ungrouped';
      const gName = m.group?.name || '未分組 (Ungrouped)';

      if (!grouped[gId]) {
        grouped[gId] = { id: gId.toString(), name: gName, members: [] };
      }
      grouped[gId].members.push(m);
    });

    // Sub-sorting: Group Leaders at top, then sort by generic student NO. ascending
    Object.values(grouped).forEach(gItem => {
        gItem.members.sort((a, b) => {
            if (a.is_leader && !b.is_leader) return -1;
            if (!a.is_leader && b.is_leader) return 1;
            return a.student_no.localeCompare(b.student_no);
        });
    });

    // Cleanup empty ungrouped bucket if empty
    if (grouped['ungrouped'].members.length === 0) {
      delete grouped['ungrouped'];
    }

    return Object.values(grouped).sort((a,b) => {
        // Bring presenting group to the front
        if (a.id.toString() === presentingGroupId?.toString()) return -1;
        if (b.id.toString() === presentingGroupId?.toString()) return 1;
        return a.name.localeCompare(b.name);
    });
  }, [members, presentingGroupId]);

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-xl font-bold mb-4 text-gray-800">👥 分組成員</h2>
      
      <div className="flex flex-wrap gap-4">
        {groupedMembers.map(g => {
          const isPresenting = g.id.toString() === presentingGroupId?.toString();
          
          return (
             <div 
               key={g.id} 
               className={`flex-1 min-w-[250px] max-w-[320px] rounded-lg shadow-sm border overflow-hidden ${
                 isPresenting ? 'border-amber-300 bg-amber-50' : 'border-gray-200 bg-white'
               }`}
             >
                <div className={`px-4 py-2 border-b font-semibold flex justify-between items-center ${
                  isPresenting ? 'bg-amber-100 text-amber-900' : 'bg-gray-100 text-gray-700'
                }`}>
                   <span>
                     📁 {g.name}
                     {isPresenting && <span className="ml-2 text-sm font-extrabold text-amber-600 bg-amber-200 px-2 py-0.5 rounded">🎙️ 報告組</span>}
                   </span>
                </div>
                
                <ul className="divide-y divide-gray-200/50 p-2">
                  {g.members.map(member => (
                    <li key={member.id} className="px-2 py-1.5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-800">{member.name}</span>
                        <span className="text-xs text-gray-500">
                          ({member.student_no}) {member.is_leader && <span className="font-bold text-amber-500">&lt;組長&gt;</span>}
                        </span>
                      </div>
                      
                      {/* Indicator showing the Hand Raise */}
                      {member.hand_raised && (
                         onRate ? (
                           <button 
                             onClick={() => member.hand_raise_id && onRate(member.id, member.hand_raise_id)}
                             className="animate-bounce hover:scale-125 transition-transform" 
                             title="點名評分"
                           >
                             🙋‍♂️
                           </button>
                         ) : (
                           <span className="animate-bounce" title="舉手中">🙋‍♂️</span>
                         )
                      )}
                    </li>
                  ))}
                </ul>
             </div>
          );
        })}
      </div>
    </div>
  );
}