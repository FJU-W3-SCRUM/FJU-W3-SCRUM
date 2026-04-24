'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import HandsUpInteractiveLayout from '@/components/hands-up/HandsUpInteractiveLayout';
import ClassOverview from '@/components/hands-up/ClassOverview';
import HandsUpQueue from '@/components/hands-up/HandsUpQueue';
import RatingModal from '@/components/hands-up/RatingModal';
import { useHandsUpSync } from '@/hooks/useHandsUpSync';

export default function SessionPage() {
  const params = useParams();
  const session_id = params.session_id as string;
  
  // Dummy local states waiting for API endpoints
  const [canManage, setCanManage] = useState(true); // Example toggle: teacher vs student view
  const [currentUserAccountId, setCurrentUserAccountId] = useState('1'); 
  
  const [initialQueue, setInitialQueue] = useState([]);
  const [initialMembers, setInitialMembers] = useState([]);
  
  // Custom hook for < 1sec sync (Supabase postgres_changes)
  const { queue, members } = useHandsUpSync({ sessionId: session_id, initialQueue, initialMembers });

  const [ratingModalOpen, setRatingModalOpen] = useState(false);
  const [ratingTarget, setRatingTarget] = useState<{accountId: string, handRaiseId: string} | null>(null);

  useEffect(() => {
    // Initial Fetch
    fetch(`/api/hands-up/overview?session_id=${session_id}`)
      .then(res => res.json())
      .then(data => {
         if(data && !data.error) {
           setInitialQueue(data.hands_up_queue || []);
           setInitialMembers(data.members || []);
         }
      })
      .catch(err => console.error("Initial load failed", err));
  }, [session_id]);

  const handleRaiseHand = async () => {
    try {
      await fetch('/api/hands-up', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id, account_id: currentUserAccountId })
      });
    } catch(e) {
      console.error(e);
    }
  };

  const handleClearHands = async () => {
    try {
      await fetch('/api/hands-up/clear-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id })
      });
    } catch(e) {
      console.error(e);
    }
  };

  const handleSelectStudentForRating = (accountId: string, handRaiseId: string) => {
     setRatingTarget({ accountId, handRaiseId });
     setRatingModalOpen(true);
  };

  const handleSubmitRating = async (stars: number) => {
    if (!ratingTarget) return;
    try {
      await fetch('/api/hands-up/rate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id,
          target_account_id: ratingTarget.accountId,
          rater_account_id: currentUserAccountId,
          stars
        })
      });
    } catch(e) {
       console.error("Failed rating", e);
    } finally {
       setRatingModalOpen(false);
       setRatingTarget(null);
    }
  };

  // Convert array members to a fast map for the HandsUpQueue
  const membersMap: Record<string, any> = {};
  members.forEach(m => membersMap[m.id] = m);

  // Derive target modal UI attributes safely
  const targetName = ratingTarget ? membersMap[ratingTarget.accountId]?.name : "";
  const targetNo = ratingTarget ? membersMap[ratingTarget.accountId]?.student_no : "";

  return (
    <>
      <HandsUpInteractiveLayout 
        overviewView={<ClassOverview members={members} />}
        queueView={
          <HandsUpQueue 
            queue={queue} 
            membersMap={membersMap} 
            canManage={canManage} 
            onRaiseHand={handleRaiseHand}
            onSelectStudent={handleSelectStudentForRating}
          />
        }
      >
        <div className="flex justify-between items-center w-full">
           <div className="flex gap-4 items-center">
             <span className="bg-green-100 text-green-800 font-bold px-3 py-1 rounded-full text-sm">🟢 Q&A 開放中</span>
             <h1 className="font-bold text-xl text-gray-700">課堂即時互動 (Session {session_id})</h1>
           </div>
           {canManage && (
              <div className="flex gap-2">
                 <button onClick={handleClearHands} className="px-4 py-2 bg-red-50 text-red-600 font-bold rounded-lg border border-red-200 hover:bg-red-100">
                    🧹 放下所有舉手
                 </button>
              </div>
           )}
        </div>
      </HandsUpInteractiveLayout>

      <RatingModal 
         isOpen={ratingModalOpen}
         studentName={targetName}
         studentId={ratingTarget?.accountId || ""}
         studentNo={targetNo}
         onClose={() => setRatingModalOpen(false)}
         onSubmit={handleSubmitRating}
      />
    </>
  );
}