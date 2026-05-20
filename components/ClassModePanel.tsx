"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

export default function ClassModePanel({ user }: { user: any }) {
  const router = useRouter();
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Teacher UI state
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [title, setTitle] = useState<string>(`課堂互動 - ${new Date().toLocaleDateString()}`);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/class-mode/sessions');
        const data = await res.json();
        setSessions(data.sessions || []);

        // load classes for teacher/admin (same logic as ReportModePanel)
        if (user?.role && (user.role.toLowerCase() === 'teacher' || user.role.toLowerCase() === 'admin')) {
          try {
            const { data: cls, error } = await supabase
              .from('classes')
              .select('id, class_name')
              .order('created_at', { ascending: false });

            if (error) {
              console.error('Failed to load classes', error);
            } else {
              setClasses(cls || []);
              if (cls && cls.length > 0) setSelectedClassId(String(cls[0].id));
            }
          } catch (e) {
            console.error('Failed to load classes', e);
          }
        }
      } catch (e) {
        console.error('Failed to load class mode sessions', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  if (loading) return <div className="p-4 bg-white dark:bg-gray-800 rounded">載入中...</div>;

  const handleCreateSession = async () => {
    if (!selectedClassId) {
      alert('請選擇班級');
      return;
    }
    try {
      setLoading(true);

      // end existing active sessions for this class
      await supabase.from('sessions').update({ ends_at: new Date().toISOString(), status: 'closed' }).eq('class_id', selectedClassId).is('ends_at', null);

      const { data: newSession, error } = await supabase.from('sessions').insert([{ class_id: Number(selectedClassId), title, status: 'active', starts_at: new Date().toISOString() }]).select().single();
      if (error) throw error;

      // navigate to session in class mode
      router.push(`/sessions/${newSession.id}?mode=class`);
    } catch (e) {
      console.error('Failed to create class mode session', e);
      alert('建立課堂失敗，請查看 console');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-gray-800 p-4 rounded shadow-md border border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold mb-4">上課模式 - 可加入的課堂</h2>
        {sessions.length === 0 ? (
          <p className="text-sm text-gray-500">目前沒有可加入的上課模式課程。</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sessions.map((s: any) => (
              <div key={s.id} className="p-3 border rounded hover:shadow cursor-pointer bg-gray-50 dark:bg-gray-900" onClick={() => router.push(`/sessions/${s.id}?mode=class`)}>
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-bold text-gray-800 dark:text-gray-100">{s.title}</div>
                    <div className="text-xs text-gray-500">{s.class_name}</div>
                  </div>
                  <div className="text-xs text-green-700 bg-green-100 px-2 py-1 rounded">加入</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Teacher/Admin: create new class-mode session */}
      {(user?.role?.toLowerCase() === 'teacher' || user?.role?.toLowerCase() === 'admin') && (
        <div className="bg-white dark:bg-gray-800 p-4 rounded shadow-md border border-gray-200 dark:border-gray-700 max-w-2xl">
          <h3 className="font-semibold mb-3">建立新上課模式課堂</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm mb-1">課堂標題</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full p-2 border rounded bg-white dark:bg-gray-700" />
            </div>

            <div>
              <label className="block text-sm mb-1">選擇班級</label>
              <select value={selectedClassId} onChange={(e) => setSelectedClassId(e.target.value)} className="w-full p-2 border rounded bg-white dark:bg-gray-700">
                {classes.map((c) => (
                  <option key={c.id} value={String(c.id)}>{c.class_name}</option>
                ))}
              </select>
            </div>

            <div className="flex justify-end">
              <button onClick={handleCreateSession} className="px-4 py-2 bg-green-600 text-white rounded">開始課堂</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
