"use client";
import React, { useEffect, useState } from "react";

type Group = { id: number; group_name: string; class_id?: number };
type Member = { id: number; student_no: string; is_leader: boolean };

export default function GroupsPanel() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [selected, setSelected] = useState<Group | null>(null);
  const [newName, setNewName] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [newMemberNo, setNewMemberNo] = useState("");

  async function loadGroups() {
    const res = await fetch("/api/groups");
    const j = await res.json();
    if (j.ok) setGroups(j.groups || []);
  }

  async function loadMembers(group_id: number) {
    const res = await fetch(`/api/group_members?group_id=${group_id}`);
    const j = await res.json();
    if (j.ok) setMembers(j.members || []);
  }

  useEffect(() => { loadGroups(); }, []);

  async function createGroup() {
    const res = await fetch("/api/groups", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ group_name: newName }) });
    const j = await res.json();
    if (j.ok) { setNewName(""); loadGroups(); }
  }

  async function addMember() {
    if (!selected) return;
    const res = await fetch("/api/group_members", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ group_id: selected.id, student_no: newMemberNo }) });
    const j = await res.json();
    if (j.ok) { setNewMemberNo(""); loadMembers(selected.id); }
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

        <div className="flex-1">
          <div className="font-medium mb-2">成員 ({selected?.group_name ?? '-'})</div>
          {selected ? (
            <div>
              <div className="flex gap-2 mb-2">
                <input value={newMemberNo} onChange={(e) => setNewMemberNo(e.target.value)} className="p-2 border flex-1" placeholder="輸入學號加入" />
                <button onClick={addMember} className="px-3 py-1 bg-green-600 text-white rounded">加入</button>
              </div>

              <ul>
                {members.map((m) => (
                  <li key={m.id} className="flex items-center justify-between py-1">
                    <span>{m.student_no} {m.is_leader && <strong className="ml-2 text-sm text-yellow-600">(組長)</strong>}</span>
                    <button onClick={() => removeMember(m.id)} className="text-sm text-red-600">移除</button>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="text-sm text-gray-500">請從左側選擇一個組別</div>
          )}
        </div>
      </div>
    </div>
  );
}
