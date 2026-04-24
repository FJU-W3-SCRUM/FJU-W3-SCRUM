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
  
  const [message, setMessage] = useState("");

  // ============================
  // Student Flow
  // ============================
  const checkStudentSession = async () => {
    try {
      // Find classes the student belongs to
      const { data: memberData, error: memErr } = await supabase
        .from("class_members")
        .select("class_id")
        .eq("account_id", accountId);

      if (memErr || !memberData || memberData.length === 0) {
        setMessage("您目前沒有加入任何班級。");
        setLoading(false);
        return;
      }

      const classIds = memberData.map((m) => m.class_id);

      // Find an active session for those classes
      const { data: sessionData, error: sessErr } = await supabase
        .from("sessions")
        .select("id, status")
        .in("class_id", classIds)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (sessErr || !sessionData) {
        setMessage("目前沒有進行中的報告模式，請稍候再試。");
        setLoading(false);
        return;
      }

      // Found active session! Redirect.
      router.push(`/sessions/${sessionData.id}`);
    } catch (e) {
      console.error(e);
      setMessage("系統發生錯誤，請聯絡管理員。");
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
       if (accountId) {
          checkStudentSession();
       } else {
          setMessage("無法取得您的學號身分。");
          setLoading(false);
       }
    } else {
       fetchTeacherClasses();
    }
  }, [role, accountId]);

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
       
       // 1. Create a new session for this class
       const { data: newSession, error: sErr } = await supabase
         .from("sessions")
         .insert([{
             class_id: selectedClassId,
             title: `課堂互動 - ${new Date().toLocaleDateString()}`,
             status: 'active',
             qna_open: true,
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
      <div className="bg-white dark:bg-gray-800 p-6 rounded shadow-md border border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">報告模式</h2>
        <div className="py-8 text-center text-gray-600 dark:text-gray-400">
          <p className="text-lg">{message}</p>
          <button 
             onClick={checkStudentSession}
             className="mt-6 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium"
          >
             重新整理
          </button>
        </div>
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