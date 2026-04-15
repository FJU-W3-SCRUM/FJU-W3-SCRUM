"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";

type Group = { id: number; group_name: string; class_id?: number };

export default function GroupsPanel() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [newName, setNewName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [classes, setClasses] = useState<{id:number,class_name:string}[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);

  async function loadGroups() {
    const qs = selectedClassId ? `?class_id=${selectedClassId}` : '';
    const res = await fetch(`/api/groups${qs}`);
    const j = await res.json();
    if (j.ok) setGroups(j.groups || []);
  }

  async function loadClasses() {
    const res = await fetch('/api/classes');
    const j = await res.json();
    if (j.ok) setClasses(j.classes || []);
  }

  useEffect(() => { loadGroups(); }, []);
  useEffect(() => { loadClasses(); }, []);
  useEffect(() => { loadGroups(); }, [selectedClassId]);

  async function createGroup() {
    setError(null);
    if (!selectedClassId) {
      setError("請先選擇班別");
      return;
    }
    if (!newName || newName.trim() === "") {
      setError("請輸入組別名稱");
      return;
    }
    const payload: any = { group_name: newName.trim(), class_id: selectedClassId };
    const res = await fetch("/api/groups", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const j = await res.json();
    if (j.ok) { setNewName(""); loadGroups(); }
    else { setError(j.error || "建立分組失敗"); }
  }

  async function deleteGroup(group_id: number) {
    if (!window.confirm("確定要刪除此組別嗎?")) return;
    const res = await fetch("/api/groups", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: group_id }) });
    const j = await res.json();
    if (j.ok) { loadGroups(); }
    else { setError(j.error || "刪除分組失敗"); }
  }

  return (
    <div className="bg-white p-4 rounded shadow">
      <h3 className="font-medium mb-3">分組設定</h3>
      {error && <div className="text-sm text-red-600 mb-3 p-2 bg-red-50 rounded">{error}</div>}
      
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">班別</label>
        <select 
          className="w-full p-2 border rounded" 
          value={selectedClassId ?? ''} 
          onChange={(e) => setSelectedClassId(e.target.value ? Number(e.target.value) : null)}
        >
          <option value="">-- 請選擇班別 --</option>
          {classes.map(c => <option key={c.id} value={c.id}>{c.class_name}</option>)}
        </select>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">建立新組別</label>
        <div className="flex gap-2">
          <input 
            value={newName} 
            onChange={(e) => setNewName(e.target.value)} 
            placeholder="輸入組別名稱"
            className="flex-1 p-2 border rounded" 
          />
          <button onClick={createGroup} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">建立</button>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">組別列表</label>
        <div className="border rounded">
          {groups.length === 0 ? (
            <div className="p-4 text-sm text-gray-500 text-center">尚無組別</div>
          ) : (
            <ul className="divide-y">
              {groups.map((g) => (
                <li key={g.id} className="p-3 flex justify-between items-center hover:bg-gray-50">
                  <span className="text-sm">{g.group_name}</span>
                  <div className="flex gap-2">
                    <Link 
                      href={`/groups/${g.id}/edit`}
                      className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded"
                    >
                      編輯
                    </Link>
                    <button 
                      onClick={() => deleteGroup(g.id)} 
                      className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded"
                    >
                      刪除
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
