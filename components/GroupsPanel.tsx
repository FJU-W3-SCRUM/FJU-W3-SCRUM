"use client";
import React, { useEffect, useState } from "react";

type Group = { id: number; group_name: string; class_id?: number };
type Member = { id: number; student_no: string; is_leader: boolean };

export default function GroupsPanel() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [selected, setSelected] = useState<Group | null>(null);
  const [newName, setNewName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [newMemberNo, setNewMemberNo] = useState("");
  const [classes, setClasses] = useState<{id:number,class_name:string}[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [students, setStudents] = useState<{student_no:string,name?:string}[]>([]);
  const [selectedStudentNos, setSelectedStudentNos] = useState<string[]>([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState<number[]>([]);

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

  async function loadStudents() {
    if (!selectedClassId) { setStudents([]); return; }
    const res = await fetch(`/api/accounts?class_id=${selectedClassId}`);
    const j = await res.json();
    if (j.ok) setStudents((j.accounts || []).map((a:any)=>({ student_no: a.student_no, name: a.name })));
  }

  async function loadMembers(group_id: number) {
    const res = await fetch(`/api/group_members?group_id=${group_id}`);
    const j = await res.json();
    if (j.ok) setMembers(j.members || []);
  }

  useEffect(() => { loadGroups(); }, []);
  useEffect(() => { loadClasses(); }, []);
  useEffect(() => { loadGroups(); setSelected(null); setMembers([]); loadStudents(); }, [selectedClassId]);

  async function createGroup() {
    setError(null);
    if (!newName || newName.trim() === "") {
      setError("請輸入組別名稱");
      return;
    }
    const payload: any = { group_name: newName.trim() };
    if (selectedClassId) payload.class_id = selectedClassId;
    const res = await fetch("/api/groups", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const j = await res.json();
    if (j.ok) { setNewName(""); loadGroups(); }
    else { setError(j.error || "建立分組失敗"); }
  }

  async function addMember() {
    if (!selected) return;
    const res = await fetch("/api/group_members", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ group_id: selected.id, student_no: newMemberNo }) });
    const j = await res.json();
    if (j.ok) { setNewMemberNo(""); loadMembers(selected.id); }
  }

  async function addMemberByStudentNo(student_no: string) {
    if (!selected) return;
    const res = await fetch("/api/group_members", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ group_id: selected.id, student_no }) });
    const j = await res.json();
    return j;
  }

  async function addSelectedStudents() {
    if (!selected) return;
    for (const sno of selectedStudentNos) {
      await addMemberByStudentNo(sno);
    }
    setSelectedStudentNos([]);
    loadMembers(selected.id);
  }

  async function removeSelectedMembers() {
    if (!selected) return;
    for (const id of selectedMemberIds) {
      await removeMember(id);
    }
    setSelectedMemberIds([]);
    loadMembers(selected.id);
  }

  async function removeMember(id: number) {
    const res = await fetch("/api/group_members", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    const j = await res.json();
    if (j.ok && selected) loadMembers(selected.id);
  }

  return (
    <div className="bg-white p-4 rounded shadow">
      <h3 className="font-medium mb-3">分組管理</h3>
      <div className="flex gap-4">
        <div className="w-1/3">
          <div className="mb-2">班別</div>
          <select className="w-full p-2 border mb-4" value={selectedClassId ?? ''} onChange={(e)=>{ setSelectedClassId(e.target.value ? Number(e.target.value): null)}}>
            <option value="">-- 請選擇班別 --</option>
            {classes.map(c=> <option key={c.id} value={c.id}>{c.class_name}</option>)}
          </select>

          <div className="mb-2">建立新組</div>
          <input value={newName} onChange={(e) => setNewName(e.target.value)} className="w-full mb-2 p-2 border" />
          <button onClick={createGroup} className="px-3 py-1 bg-blue-600 text-white rounded">建立</button>

          <div className="mt-4">
            <div className="font-medium mb-2">組別列表</div>
            <ul className="text-sm">
              {groups.map((g) => (
                <li key={g.id} className={`py-1 cursor-pointer ${selected?.id === g.id ? 'font-semibold' : ''}`} onClick={() => { setSelected(g); loadMembers(g.id); }}>{g.group_name}</li>
              ))}
            </ul>
          </div>
        </div>
        <div className="w-2/3">
          {error && <div className="text-sm text-red-600 mb-2">{error}</div>}
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-1 bg-gray-50 p-2">
              <div className="font-medium mb-2">學生清單</div>
              <div className="text-sm mb-2 text-gray-500">(可多選或拖曳至右側)</div>
              <div className="max-h-64 overflow-auto">
                {students.map(s=> (
                  <div key={s.student_no} className="flex items-center gap-2 py-1" draggable onDragStart={(e)=>{ e.dataTransfer.setData('text/plain', s.student_no); }}>
                    <input type="checkbox" checked={selectedStudentNos.includes(s.student_no)} onChange={(e)=>{
                      setSelectedStudentNos(prev=> e.target.checked ? [...prev, s.student_no] : prev.filter(x=>x!==s.student_no));
                    }} />
                    <div className="text-sm">{s.student_no} {s.name && <span className="ml-2 text-gray-600">{s.name}</span>}</div>
                  </div>
                ))}
              </div>
              <div className="mt-2">
                <button onClick={addSelectedStudents} className="px-3 py-1 bg-green-600 text-white rounded mr-2">加入選取</button>
              </div>
            </div>

            <div className="col-span-2 bg-white p-2 border">
              <div className="flex items-center justify-between mb-2">
                <div className="font-medium">成員 ({selected?.group_name ?? '-'})</div>
                <div>
                  <button onClick={removeSelectedMembers} className="px-2 py-1 text-sm text-red-600">移除選取</button>
                </div>
              </div>
              {!selected ? <div className="text-sm text-gray-500">請從左側選擇一個組別</div> : (
                <div onDragOver={(e)=>e.preventDefault()} onDrop={async (e)=>{ const sno = e.dataTransfer.getData('text/plain'); if (sno) { await addMemberByStudentNo(sno); loadMembers(selected.id); } }}>
                  <div className="max-h-64 overflow-auto">
                    {members.map((m) => (
                      <div key={m.id} className="flex items-center justify-between py-1">
                        <div className="flex items-center gap-2">
                          <input type="checkbox" checked={selectedMemberIds.includes(m.id)} onChange={(e)=>{
                            setSelectedMemberIds(prev=> e.target.checked ? [...prev, m.id] : prev.filter(x=>x!==m.id));
                          }} />
                          <span>{m.student_no} {m.is_leader && <strong className="ml-2 text-sm text-yellow-600">(組長)</strong>}</span>
                        </div>
                        <button onClick={() => removeMember(m.id)} className="text-sm text-red-600">移除</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
