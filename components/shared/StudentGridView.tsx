"use client";

import React from 'react';

// A generic type for a student or member
interface Member {
  id: string;
  name: string;
  student_no: string;
  group?: {
    id: string;
    group_name: string;
  };
  [key: string]: any; // Allow other properties
}

interface StudentGridViewProps {
  members: Member[];
  presentingGroupId?: string | null;
  renderCardContent: (member: Member) => React.ReactNode;
  onCardClick?: (member: Member) => void;
}

export default function StudentGridView({
  members,
  presentingGroupId,
  renderCardContent,
  onCardClick,
}: StudentGridViewProps) {
  
  const sortedMembers = [...members].sort((a, b) => {
    const groupA = a.group?.group_name || 'Z';
    const groupB = b.group?.group_name || 'Z';
    if (groupA < groupB) return -1;
    if (groupA > groupB) return 1;
    return (a.student_no || '').localeCompare(b.student_no || '');
  });

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 p-4 bg-gray-100 dark:bg-gray-900 rounded-lg">
      {sortedMembers.map((member) => {
        const isPresentingGroup = member.group?.id === presentingGroupId;
        
        return (
          <div
            key={member.id}
            onClick={() => onCardClick?.(member)}
            className={`
              p-3 rounded-lg shadow-md transition-all duration-200
              ${isPresentingGroup 
                ? 'bg-yellow-100 dark:bg-yellow-900 border-2 border-yellow-400' 
                : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700'}
              ${onCardClick ? 'cursor-pointer hover:shadow-lg hover:scale-105' : ''}
            `}
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="font-bold text-lg text-gray-900 dark:text-white">{member.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{member.student_no}</p>
              </div>
              <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200">
                {member.group?.group_name || '未分組'}
              </span>
            </div>
            
            {/* Render custom content */}
            <div className="mt-3">
              {renderCardContent(member)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
