"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

interface ReportModePanelProps {
  user: {
    id: string; // Wait, AuthLayout user prop has `account_id`? Let's check the schema.
    student_no: string;
    role?: string;
  };
}

export default function ReportModePanel({ user }: ReportModePanelProps) {
  const router = useRouter();
  const role = user?.role?.toLowerCase() || "student";
  const accountId = user?.id || null;

  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<{ id: string; class_name: string }[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [groups, setGroups] = useState<{ id: string; group_name: string }[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  
  const [availableSessions, setAvailableSessions] = useState<any[]>([]);
  const [message, setMessage] = useState("");

  // ============================
  // Student Flow
  // ============================
  const fetchStudentSessions = async () => {
    if (!user?.student_no) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/hands-up/student-sessions?student_no=${user.student_no}`);
      const data = await res.json();
      
      if (data.error) throw new Error(data.error);
      
      setAvailableSessions(data.sessions || []);
      if (data.sessions?.length === 0) {
        setMessage("目前沒有進行中的報告模式，請稍候再試。");
      }
    } catch (e) {
      console.error(e);
      setMessage("系統發生錯誤，無法取得課堂資訊。");
    } finally {
      setLoading(false);
    }
  };

  // ============================
  // Teacher Flow
  // ============================
  const fetchTeacherClasses = async () => {
    try {
      const { data, error } = await supabase
        .from("classes")
        .select("id, class_name")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setClasses(data || []);
      if (data && data.length > 0) {
        setSelectedClassId(data[0].id.toString());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadGroupsByClass = async (classId: string) => {
    if (!classId) return;
    try {
      const { data, error } = await supabase
        .from("groups")
        .select("id, group_name")
        .eq("class_id", classId)
        .order("group_name", { ascending: true });
        
      if (error) throw error;
      setGroups(data || []);
      if (data && data.length > 0) {
        setSelectedGroupId(data[0].id.toString());
      } else {
        setSelectedGroupId("");
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (role === "student") {
       fetchStudentSessions();
    } else {
       fetchTeacherClasses();
    }
  }, [role, user?.student_no]);

  useEffect(() => {
    if (selectedClassId) {
      loadGroupsByClass(selectedClassId);
    }
  }, [selectedClassId]);

  const handleStartSession = async () => {
    if (!selectedClassId || !selectedGroupId) {
       alert("請選擇上課班級與報告組別");
       return;
    }
    try {
       setLoading(true);
       
       // 0. Auto-end existing unclosed sessions for this class
       await supabase
         .from("sessions")
         .update({ 
            ends_at: new Date().toISOString(),
            status: 'closed'
         })
         .eq("class_id", selectedClassId)
         .is("ends_at", null);

       // 1. Create a new session for this class
       const { data: newSession, error: sErr } = await supabase
         .from("sessions")
         .insert([{
             class_id: selectedClassId,
             title: `課堂互動 - ${new Date().toLocaleDateString()}`,
             status: 'R',
             qna_open: false,
             starts_at: new Date().toISOString()
         }])
         .select()
         .single();

       if (sErr) throw sErr;
       
       // 2. Assign the presenting group (session_groups)
       const { error: sgErr } = await supabase
         .from("session_groups")
         .insert([{
             session_id: newSession.id,
             group_id: selectedGroupId
         }]);

       if (sgErr) throw sgErr;

       // 3. Redirect to the session page
       router.push(`/sessions/${newSession.id}`);
       
    } catch(e) {
       console.error("Failed to start session:", e);
       alert("無法啟動上課模式，請查看 Console 錯誤");
       setLoading(false);
    }
  };


  if (loading) {
    return <div className="p-4 bg-white dark:bg-gray-800 rounded shadow-md">載入中...</div>;
  }

  // Student rendering (if reached here, no active session found)
  if (role === "student") {
    return (
      <div className="bg-white dark:bg-gray-800 p-6 rounded shadow-md border border-gray-200 dark:border-gray-700 w-full max-w-4xl">
        <div className="flex justify-between items-center mb-6">
           <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">請選擇進行中的課堂</h2>
           <button 
             onClick={fetchStudentSessions}
             className="px-3 py-1 bg-blue-50 text-blue-600 rounded border border-blue-200 hover:bg-blue-100 text-sm font-medium"
           >
             重新整理
           </button>
        </div>

        {availableSessions.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {availableSessions.map((s) => (
              <div 
                key={s.id} 
                className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-400 dark:hover:border-blue-500 cursor-pointer transition-colors bg-gray-50 dark:bg-gray-900 group"
                onClick={() => router.push(`/sessions/${s.id}`)}
              >
                <div className="flex justify-between items-start">
                   <div>
                      <h3 className="font-bold text-lg text-gray-800 dark:text-gray-200 group-hover:text-blue-600">{s.class_name}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{s.title}</p>
                   </div>
                   <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-bold rounded">
                      正在進行中
                   </span>
                </div>
                <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
                   <span>開始時間: {new Date(s.starts_at).toLocaleString()}</span>
                   <span className="font-bold text-blue-600">點擊進入 &rarr;</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-12 text-center text-gray-600 dark:text-gray-400">
            <p className="text-lg">{message}</p>
          </div>
        )}
      </div>
    );
  }

  // Teacher/Admin rendering
  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded shadow-md border border-gray-200 dark:border-gray-700 max-w-2xl">
      <h2 className="text-xl font-semibold mb-6 text-gray-900 dark:text-gray-100">設定報告模式</h2>
      
      <div className="space-y-6">
        <div>
           <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">上課班別</label>
           <select 
             className="w-full p-2 border rounded bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"
             value={selectedClassId}
             onChange={(e) => setSelectedClassId(e.target.value)}
           >
             {classes.map(c => (
               <option key={c.id} value={c.id}>{c.class_name}</option>
             ))}
           </select>
        </div>

        <div>
           <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">指定報告組</label>
           <select 
             className="w-full p-2 border rounded bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"
             value={selectedGroupId}
             onChange={(e) => setSelectedGroupId(e.target.value)}
             disabled={groups.length === 0}
           >
             {groups.map(g => (
               <option key={g.id} value={g.id}>{g.group_name}</option>
             ))}
           </select>
           {groups.length === 0 && <p className="text-sm text-red-500 mt-1">此班級尚無建立任何組別</p>}
        </div>

        <div className="pt-4 flex justify-end">
           <button 
              onClick={handleStartSession}
              disabled={!selectedClassId || !selectedGroupId}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold disabled:bg-gray-400"
           >
              開始
           </button>
        </div>
      </div>
    </div>
  );
}