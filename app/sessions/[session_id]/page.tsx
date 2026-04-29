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
  const [isReportingLeader, setIsReportingLeader] = useState(false);
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
         const isTeacher = user.role === 'admin' || user.role === 'teacher';
         setCanManage(isTeacher);
         
         // Record session start time if teacher enters and session hasn't started
         if (isTeacher && session_id) {
            fetch('/api/hands-up/update-session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ session_id, session_action: 'start_session' })
            }).catch(err => console.error("Auto-start session failed", err));
         }
      } else {
         router.push('/');
      }
    } catch(e) {
      router.push('/');
    }
  }, [router, session_id]);

  const [initialQueue, setInitialQueue] = useState<any[]>([]);
  const [initialMembers, setInitialMembers] = useState<any[]>([]);
  
  // Define update logic in a shared function
  const updateUIFromData = (data: any) => {
    if(!data || data.error) return;
    
    const sessionStatus = data.session_status || '';
    
    // 檢查課堂是否已關閉 - 如果已關閉，重定向到首頁
    if (sessionStatus === 'closed') {
      console.log('[SessionPage] 課堂已結束，重定向到首頁');
      router.push('/');
      return;
    }
    
    setClassName(data.class_name || "");
    setQnaOpen(data.qna_open !== false);
    
    const dbGroupId = data.presenting_group_id?.toString() || null;
    const groups = data.available_groups || [];
    
    setPresentingStatus(data.presenting_status || 'N');
    setSessionStatus(sessionStatus);
    setAvailableGroups(groups);

    // Group selection persistence
    if (!dbGroupId && sessionStatus === 'open' && groups.length > 0) {
       setPresentingGroupId(groups[0].id.toString());
    } else {
       setPresentingGroupId(dbGroupId);
    }
  };

  // Custom hook for < 1sec sync (Supabase WebSocket)
  const { queue, members, refresh } = useHandsUpSync({ 
      sessionId: session_id, 
      initialQueue, 
      initialMembers,
      onDataUpdate: updateUIFromData 
  });

  useEffect(() => {
     // Check if current student is the leader of the reporting group
     if (currentUser && presentingGroupId && members.length > 0) {
        const myInfo = members.find(m => m.student_no === currentUser.student_no);
        const isLeader = myInfo?.is_leader && myInfo?.group?.id?.toString() === presentingGroupId.toString();
        setIsReportingLeader(!!isLeader);
     }
  }, [currentUser, presentingGroupId, members]);

  // Unified permission to control report/Q&A/Clear
  const canControlReport = canManage || isReportingLeader;
  
  const [ratingModalOpen, setRatingModalOpen] = useState(false);
  const [ratingTarget, setRatingTarget] = useState<{accountId: string, handRaiseId: string} | null>(null);

  useEffect(() => {
    // Initial Fetch
    fetch(`/api/hands-up/overview?session_id=${session_id}`)
      .then(res => res.json())
      .then(async (data) => {
          if(data && !data.error) {
           setInitialQueue(data.hands_up_queue || []);
           setInitialMembers(data.members || []);
           updateUIFromData(data);
           
           // 修復：根據課堂所屬的班級和用戶身份，查詢正確的 account_id
           if (currentUser && data.class_id) {
             try {
               if (!canManage) {
                 // 學生：根據 student_no + class_id 查詢正確的 account_id
                 const res = await fetch(`/api/auth/get-account-id-by-class?student_no=${currentUser.student_no}&class_id=${data.class_id}`);
                 const result = await res.json();
                 
                 if (result.account_id) {
                   console.log(`[SessionPage] 更正學生 account_id: ${currentUserAccountId} → ${result.account_id} (for class_id: ${data.class_id})`);
                   setCurrentUserAccountId(result.account_id);
                 }
               } else {
                 // 老師：嘗試從該班級查詢對應的 teacher_id
                 const res = await fetch(`/api/auth/get-teacher-account-id?class_id=${data.class_id}`);
                 const result = await res.json();
                 
                 if (result.teacher_account_id) {
                   console.log(`[SessionPage] 更正老師 account_id: ${currentUserAccountId} → ${result.teacher_account_id} (for class_id: ${data.class_id})`);
                   setCurrentUserAccountId(result.teacher_account_id);
                 } else {
                   console.warn(`[SessionPage] 未找到班級 ${data.class_id} 的老師 account_id，將使用 NULL 進行評分`);
                 }
               }
             } catch (e) {
               console.error('[SessionPage] Failed to get correct account_id:', e);
               // 繼續使用原有的 account_id
             }
           }
         }
      })
      .catch(err => console.error("Initial load failed", err));
  }, [session_id, currentUser, canManage, currentUserAccountId]);

  const handleToggleQna = async () => {
    const newState = !qnaOpen;
    setQnaOpen(newState);
    try {
      await fetch('/api/hands-up/update-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id, qna_open: newState })
      });
      refresh();
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
      // 1. Clear all existing hand raises (放下所有舉手)
      await fetch('/api/hands-up/clear-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id })
      });

      // 2. Update session with new group and close Q&A
      await fetch('/api/hands-up/update-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          session_id, 
          presenting_group_id: newVal,
          qna_open: false // Force close in DB as well
        })
      });
      refresh();
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
        refresh();
      }
    } catch (e) {
      console.error('Failed to update report status', e);
    }
  };

  const handleRaiseHand = async () => {
    // Check if hand is already raised
    const isRaised = queue.some(h => h.account_id === currentUserAccountId);
    
    if (isRaised) {
       // Put down
       try {
         await fetch(`/api/hands-up?session_id=${session_id}&account_id=${currentUserAccountId}`, {
           method: 'DELETE'
         });
         refresh();
       } catch(e) {
         console.error(e);
       }
    } else {
       // Raise
       try {
         await fetch('/api/hands-up', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ session_id, account_id: currentUserAccountId })
         });
         refresh();
       } catch(e) {
         console.error(e);
       }
    }
  };

  const handleClearHands = async () => {
    try {
      await fetch('/api/hands-up/clear-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id })
      });
      refresh();
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
      const res = await fetch('/api/hands-up/rate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id,
          hand_raise_id: ratingTarget.handRaiseId,
          target_account_id: ratingTarget.accountId,
          rater_account_id: currentUserAccountId,
          stars
        })
      });

      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || '評分失敗');
      }
      
      const result = await res.json();
      console.log('Rating submitted successfully:', result);
      
      // 立即刷新以更新UI
      await refresh();
      startPolling(); // Enable aggressive polling for 3 seconds
      
      alert(`評分成功！共 ${stars} 顆星`);

    } catch(e) {
       console.error("Failed rating", e);
       alert(`評分失敗: ${e instanceof Error ? e.message : '未知錯誤'}`);
    } finally {
       setRatingModalOpen(false);
       setRatingTarget(null);
    }
  };

  const handleEndSession = async () => {
    if (!confirm("確定要結束此課堂嗎？結束後將無法再進行互動。")) return;
    try {
      const res = await fetch('/api/hands-up/update-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id, session_action: 'end_session' })
      });
      if (res.ok) {
        alert("課堂已結束");
        router.push('/');
      }
    } catch(e) {
      console.error("Failed to end session", e);
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
        overviewView={<ClassOverview members={members} presentingGroupId={presentingGroupId} onRate={canControlReport ? handleSelectStudentForRating : undefined} sessionId={session_id} />}
        queueView={
          <HandsUpQueue 
            queue={queue} 
            membersMap={membersMap} 
            canManage={canControlReport} 
            qnaOpen={qnaOpen}
            onRaiseHand={handleRaiseHand}
            onSelectStudent={handleSelectStudentForRating}
            showRaiseHand={!canManage && !isReportingLeader}
            currentUserAccountId={currentUserAccountId}
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
                    {canControlReport && (
                      <button
                          onClick={handleReportToggle}
                          disabled={!presentingGroupId || presentingStatus === 'Y'}
                          className={`px-3 py-1 rounded text-sm font-semibold transition ${presentingStatus === 'P' ? 'bg-amber-400 text-white' : 'bg-green-600 text-white'} ${(!presentingGroupId || presentingStatus === 'Y') ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90'}`}
                      >
                          {presentingStatus === 'P' ? '結束報告' : (presentingStatus === 'Y' ? '已完成' : '開始報告')}
                      </button>
                    )}
                 </div>
             </div>
           </div>
           
           <div className="flex gap-2 items-center">
              {canControlReport && (
                <>
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
                </>
              )}

              {canManage && (
                 <button onClick={handleEndSession} className="px-4 py-2 bg-gray-800 text-white font-bold rounded-lg hover:bg-black transition-colors">
                    🏁 結束課堂
                 </button>
              )}
           </div>
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