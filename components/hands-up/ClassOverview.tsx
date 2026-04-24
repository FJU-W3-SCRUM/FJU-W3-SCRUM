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
}

interface OverviewProps {
  members: ClassMember[];
}

export default function ClassOverview({ members }: OverviewProps) {
  // Grouping members by `group.id` and sorting
  const groupedMembers = useMemo(() => {
    const grouped: Record<string, { id: string, name: string, members: ClassMember[] }> = {};
    
    // Fallback for students without group
    grouped['ungrouped'] = { id: 'ungrouped', name: '未分組 (Ungrouped)', members: [] };

    members.forEach(m => {
      const gId = m.group?.id || 'ungrouped';
      if (!grouped[gId]) {
        grouped[gId] = { id: gId, name: m.group!.name, members: [] };
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

    return Object.values(grouped).sort((a,b) => a.name.localeCompare(b.name));
  }, [members]);

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-xl font-bold mb-4 text-gray-800">👥 班級概況與分組狀態</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {groupedMembers.map(g => (
          <div key={g.id} className="border border-gray-200 bg-white rounded-lg shadow-sm">
             <div className="bg-gray-100 px-4 py-2 border-b font-semibold text-gray-700 flex justify-between">
                <span>📁 {g.name}</span>
             </div>
             
             <ul className="divide-y divide-gray-100">
               {g.members.map(member => (
                 <li key={member.id} className="px-4 py-2 flex items-center justify-between">
                   <div className="flex items-center gap-2">
                     <span className={member.is_leader ? 'text-yellow-600' : 'text-gray-400'}>
                        {member.is_leader ? '👑' : '🧑‍🎓'}
                     </span>
                     <span className="text-sm font-medium">{member.name}</span>
                     <span className="text-xs text-gray-500">({member.student_no})</span>
                   </div>
                   
                   {/* Indicator showing the Hand Raise */}
                   {member.hand_raised && (
                      <span className="animate-bounce" title="舉手中">🙋‍♂️</span>
                   )}
                 </li>
               ))}
             </ul>
          </div>
        ))}
      </div>
    </div>
  );
}