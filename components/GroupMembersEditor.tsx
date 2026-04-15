"use client";
import React, { useEffect, useState } from "react";

export default function GroupMembersEditor({ groupId }: { groupId: number | null }) {
  const [members, setMembers] = useState<Array<any>>([]);
  const [studentNo, setStudentNo] = useState("");
  const [roleAccount, setRoleAccount] = useState("");
  const [sessionId, setSessionId] = useState<number | null>(null);

  useEffect(() => {
    if (groupId) loadMembers(groupId);
  }, [groupId]);

  async function loadMembers(gid: number) {
    const res = await fetch(`/api/group_members?group_id=${gid}`);
    const j = await res.json();
    if (j.ok) setMembers(j.members || []);
  }

  async function addMember() {
    if (!groupId || !studentNo) return;
    const res = await fetch(`/api/group_members`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ group_id: groupId, student_no: studentNo }) });
    const j = await res.json();
    if (j.ok) { setStudentNo(""); loadMembers(groupId); }
  }

  async function removeMember(id: number) {
    const res = await fetch(`/api/group_members`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    const j = await res.json();
    if (j.ok && groupId) loadMembers(groupId);
  }

  async function assignSessionRole() {
    if (!sessionId || !roleAccount) return;
    const res = await fetch(`/api/session_roles`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ session_id: sessionId, account_id: roleAccount, role: "group_leader" }) });
    const j = await res.json();
    if (j.ok) alert("已指派為組長");
  }

  return (
    <div className="bg-white p-4 rounded shadow">
      <h4 className="font-medium mb-2">成員編輯</h4>
      <div className="flex gap-2 mb-3">
        <input value={studentNo} onChange={(e) => setStudentNo(e.target.value)} placeholder="學號" className="border p-2 flex-1" />
        <button onClick={addMember} className="px-3 py-1 bg-green-600 text-white rounded">加入</button>
      </div>

      <ul className="mb-3">
        {members.map((m: any) => (
          <li key={m.id} className="flex justify-between py-1">
            <span>{m.student_no} {m.is_leader && <strong className="text-yellow-600">(組長)</strong>}</span>
            <button onClick={() => removeMember(m.id)} className="text-sm text-red-600">移除</button>
          </li>
        ))}
      </ul>

      <div className="mt-4">
        <div className="text-sm mb-2">指定本堂課組長</div>
        <div className="flex gap-2">
          <input value={sessionId ?? ""} onChange={(e) => setSessionId(Number(e.target.value) || null)} placeholder="session id" className="border p-2 w-32" />
          <input value={roleAccount} onChange={(e) => setRoleAccount(e.target.value)} placeholder="學號" className="border p-2 flex-1" />
          <button onClick={assignSessionRole} className="px-3 py-1 bg-blue-600 text-white rounded">指派</button>
        </div>
      </div>
    </div>
  );
}
