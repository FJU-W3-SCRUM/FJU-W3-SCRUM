'use client';
import { useState } from 'react';

export interface HandsUpQueueProps {
  queue: Array<{
     id: string; // hand raise id
     account_id: string;
     raised_at: string;
     status: string;
  }>;
  membersMap: Record<string, any>; // mapping accountId -> member info
  canManage: boolean;              // true if teacher/presenter
  onRaiseHand: () => void;
  onSelectStudent: (accountId: string, handRaiseId: string) => void; 
}

export default function HandsUpQueue({ queue, membersMap, canManage, onRaiseHand, onSelectStudent }: HandsUpQueueProps) {
  return (
    <div className="flex flex-col h-full bg-white border border-gray-200 rounded-lg shadow min-h-[400px]">
       <div className="flex justify-between items-center p-4 border-b bg-gray-100">
         <h2 className="text-lg font-bold text-gray-800">🙋‍♂️ 舉手佇列 ({queue.length})</h2>
       </div>
       
       {/* List itself */}
       <div className="flex-1 overflow-y-auto p-2">
         {queue.length === 0 ? (
            <div className="flex justify-center items-center h-full text-gray-400">目前沒有人舉手</div>
         ) : (
            <ul className="flex flex-col gap-2">
              {queue.map((hq, index) => {
                 const member = membersMap[hq.account_id];
                 if (!member) return null; // Defensive check
                 
                 const timeFormatted = new Date(hq.raised_at).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

                 return (
                   <li key={hq.id} className="p-3 border rounded shadow-sm hover:shadow transition-shadow bg-blue-50 flex justify-between items-start">
                      <div className="flex flex-col flex-1">
                         <div className="font-semibold text-sm">
                           [{index + 1}] {member.name} ({member.group?.name || '無分組'})
                         </div>
                         <div className="text-xs text-gray-500 mt-1">
                            ⏱️ {timeFormatted}
                         </div>
                      </div>

                      {/* CTA when they have permission */}
                      {canManage && (
                        <button 
                          onClick={() => onSelectStudent(hq.account_id, hq.id)}
                          className="ml-2 px-3 py-1 text-sm bg-blue-600 outline-none text-white rounded hover:bg-blue-700 mr-2"
                        >
                           點名評分
                        </button>
                      )}
                   </li>
                 );
              })}
            </ul>
         )}
       </div>

       {/* User self control: Bottom Bar specifically for ordinary users to raise hands  */}
       <div className="p-4 border-t bg-gray-50 flex items-center justify-center">
         <button onClick={onRaiseHand} className="w-full py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 active:scale-95 transition-transform flex items-center justify-center gap-2">
            🙋‍♂️ 我要舉手
         </button>
       </div>
    </div>
  );
}