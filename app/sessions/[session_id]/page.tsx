'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AuthLayout from '@/components/AuthLayout';
import HandsUpInteractiveLayout from '@/components/hands-up/HandsUpInteractiveLayout';
import ClassOverview from '@/components/hands-up/ClassOverview';
import HandsUpQueue from '@/components/hands-up/HandsUpQueue';
import RatingModal from '@/components/hands-up/RatingModal';
import { useHandsUpSync } from '@/hooks/useHandsUpSync';

export default function SessionPage() {
  const params = useParams();
  const router = useRouter();
  const session_id = params.session_id as string;
  
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [canManage, setCanManage] = useState(false);
  const [currentUserAccountId, setCurrentUserAccountId] = useState('');
  
  const [className, setClassName] = useState('');
  const [qnaOpen, setQnaOpen] = useState(false);
  const [presentingGroupId, setPresentingGroupId] = useState<string | null>(null);
  const [availableGroups, setAvailableGroups] = useState<any[]>([]);
  const [presentingStatus, setPresentingStatus] = useState<'N'|'P'|'Y'>('N');
  const [sessionStatus, setSessionStatus] = useState<string>('');

  useEffect(() => {
    try {
      const userStr = localStorage.getItem('ch_user');
      if (userStr) {
         const user = JSON.parse(userStr);
         setCurrentUser(user);
         setCurrentUserAccountId(user.id);
         setCanManage(user.role === 'admin' || user.role === 'teacher');
      } else {
         router.push('/');
      }
    } catch(e) {
      router.push('/');
    }
  }, [router]);
  
  const [initialQueue, setInitialQueue] = useState<any[]>([]);
  const [initialMembers, setInitialMembers] = useState<any[]>([]);
  
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
           setClassName(data.class_name || "");
           setQnaOpen(data.qna_open !== false);
           
           const dbGroupId = data.presenting_group_id?.toString() || null;
           const sessionStatus = data.session_status || '';
           const groups = data.available_groups || [];
           
           setPresentingStatus(data.presenting_status || 'N');
           setSessionStatus(sessionStatus);
           setAvailableGroups(groups);
           setInitialQueue(data.hands_up_queue || []);
           setInitialMembers(data.members || []);

           // If session status is 'R' and no group is pre-selected, default to the first available group
           if (!dbGroupId && sessionStatus === 'R' && groups.length > 0) {
              setPresentingGroupId(groups[0].id.toString());
           } else {
              setPresentingGroupId(dbGroupId);
           }
         }
      })
      .catch(err => console.error("Initial load failed", err));
  }, [session_id]);

  const handleToggleQna = async () => {
    const newState = !qnaOpen;
    setQnaOpen(newState);
    try {
      await fetch('/api/hands-up/update-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id, qna_open: newState })
      });
    } catch(e) { }
  };

  const handleChangePresentingGroup = async (e: any) => {
    const newVal = e.target.value;
    setPresentingGroupId(newVal);
    setPresentingStatus('N'); // Reset status for the new group
    
    // Auto-close Q&A on group change
    if (qnaOpen) {
      setQnaOpen(false);
    }

    try {
      await fetch('/api/hands-up/update-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          session_id, 
          presenting_group_id: newVal,
          qna_open: false // Force close in DB as well
        })
      });
    } catch(e) { }
  };

  const handleReportToggle = async () => {
    if (!presentingGroupId) return;
    const action = presentingStatus === 'P' ? 'end' : 'start';
    try {
      const res = await fetch('/api/hands-up/update-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id, presenting_group_id: presentingGroupId, report_action: action })
      });
      if (res.ok) {
        setPresentingStatus(action === 'start' ? 'P' : 'Y');
      }
    } catch (e) {
      console.error('Failed to update report status', e);
    }
  };

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

  if (!currentUser) return null;

  return (
    <AuthLayout user={currentUser} onLogout={() => { localStorage.removeItem('ch_user'); router.push('/'); }}>
      <HandsUpInteractiveLayout 
        overviewView={<ClassOverview members={members} presentingGroupId={presentingGroupId} />}
        queueView={
          <HandsUpQueue 
            queue={queue} 
            membersMap={membersMap} 
            canManage={canManage} 
            qnaOpen={qnaOpen}
            onRaiseHand={handleRaiseHand}
            onSelectStudent={handleSelectStudentForRating}
          />
        }
      >
        <div className="flex justify-between items-center w-full">
           <div className="flex flex-wrap gap-4 items-center">
             <span className={`font-bold px-3 py-1 rounded-full text-sm ${qnaOpen ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-600'}`}>
                {qnaOpen ? '🟢 Q&A 開放中' : '⚪ Q&A 已關閉'}
             </span>
             <h1 className="font-bold text-xl text-gray-700">{className} - 課堂即時互動 (Session {session_id})</h1>
             
             <div className="flex flex-col gap-1 ml-4 border-l pl-4">
                 <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-600">目前報告組別:</span>
                    <select 
                        className="border border-gray-300 rounded p-1 text-sm bg-white"
                        value={presentingGroupId || ""}
                        onChange={handleChangePresentingGroup}
                        disabled={!canManage || presentingStatus === 'P'}
                    >
                        <option value="">-- 無 --</option>
                        {availableGroups.map((g: any) => (
                          <option key={g.id} value={g.id}>{g.group_name}</option>
                        ))}
                    </select>
                    <button
                        onClick={handleReportToggle}
                        disabled={!canManage || !presentingGroupId || presentingStatus === 'Y'}
                        className={`px-3 py-1 rounded text-sm font-semibold transition ${presentingStatus === 'P' ? 'bg-amber-400 text-white' : 'bg-green-600 text-white'} ${(!canManage || !presentingGroupId || presentingStatus === 'Y') ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90'}`}
                    >
                        {presentingStatus === 'P' ? '結束報告' : (presentingStatus === 'Y' ? '已完成' : '開始報告')}
                    </button>
                 </div>
             </div>
           </div>
           
           {canManage && (
              <div className="flex gap-2 items-center">
                 <div className="mr-4 flex items-center gap-2">
                    <span className="text-sm font-bold text-gray-700">開放舉手</span>
                    <button 
                       onClick={handleToggleQna}
                       className={`w-12 h-6 rounded-full relative transition-colors ${qnaOpen ? 'bg-blue-500' : 'bg-gray-300'}`}
                    >
                       <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${qnaOpen ? 'left-7' : 'left-1'}`} />
                    </button>
                 </div>
                 
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
    </AuthLayout>
  );
}