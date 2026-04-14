"use client";
import React, { useEffect, useState } from "react";

type Group = { id: number; group_name: string; class_id?: number };
type Account = { id: number; student_no: string; name: string };
type Member = { id: number; student_no: string; is_leader: boolean };

export default function GroupsPanel() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [newName, setNewName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [classes, setClasses] = useState<{id:number,class_name:string}[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  
  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [allStudents, setAllStudents] = useState<Account[]>([]);
  const [currentMembers, setCurrentMembers] = useState<Member[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
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

  async function loadStudents(classId: number) {
    const res = await fetch(`/api/accounts?class_id=${classId}`);
    const j = await res.json();
    if (j.ok) setAllStudents(j.accounts || []);
  }

  async function loadMembers(groupId: number) {
    const res = await fetch(`/api/group_members?group_id=${groupId}`);
    const j = await res.json();
    if (j.ok) setCurrentMembers(j.members || []);
  }

  useEffect(() => { loadGroups(); }, []);
  useEffect(() => { loadClasses(); }, []);
  useEffect(() => { loadGroups(); }, [selectedClassId]);

  function openEditModal(group: Group) {
    setEditingGroup(group);
    if (group.class_id) loadStudents(group.class_id);
    loadMembers(group.id);
    setSelectedStudentNos([]);
    setSelectedMemberIds([]);
    setSearchQuery("");
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditingGroup(null);
    setAllStudents([]);
    setCurrentMembers([]);
  }

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

  const [draggedStudent, setDraggedStudent] = useState<string | null>(null);

  async function addSelectedStudents() {
    if (!editingGroup) return;
    for (const sno of selectedStudentNos) {
      await fetch("/api/group_members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ group_id: editingGroup.id, student_no: sno })
      });
    }
    setSelectedStudentNos([]);
    loadMembers(editingGroup.id);
  }

  async function addStudentByDrag(studentNo: string) {
    if (!editingGroup) return;
    const res = await fetch("/api/group_members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ group_id: editingGroup.id, student_no: studentNo })
    });
    if (res.ok) {
      loadMembers(editingGroup.id);
      setDraggedStudent(null);
    }
  }

  async function removeSelectedMembers() {
    if (!editingGroup) return;
    for (const id of selectedMemberIds) {
      await fetch("/api/group_members", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
      });
    }
    setSelectedMemberIds([]);
    loadMembers(editingGroup.id);
  }

  async function toggleLeader(memberId: number, isLeader: boolean) {
    const res = await fetch("/api/group_members", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: memberId, is_leader: !isLeader })
    });
    if (editingGroup) loadMembers(editingGroup.id);
  }

  const filteredStudents = allStudents.filter(s => {
    const query = searchQuery.toLowerCase();
    const alreadyMember = currentMembers.some(m => m.student_no === s.student_no);
    return !alreadyMember && (s.student_no.toLowerCase().includes(query) || s.name.toLowerCase().includes(query));
  });

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
                    <button 
                      onClick={() => openEditModal(g)} 
                      className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded"
                    >
                      編輯
                    </button>
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

      {/* Modal */}
      {showModal && editingGroup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded shadow-lg max-w-4xl w-full max-h-[90%] overflow-auto">
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="text-lg font-medium">編輯組別: {editingGroup.group_name}</h2>
              <button onClick={closeModal} className="text-gray-500 hover:text-gray-700">✕</button>
            </div>

            <div className="p-4">
              {/* Search */}
              <div className="mb-4">
                <input
                  type="text"
                  placeholder="搜尋學生（學號/姓名）"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full p-2 border rounded"
                />
              </div>

              {/* Left and Right Lists */}
              <div className="grid grid-cols-3 gap-4">
                {/* Left: Available Students */}
                <div className="col-span-1 bg-gray-50 p-3 border rounded">
                  <div className="font-medium text-sm mb-2">可用學生</div>
                  <div className="max-h-64 overflow-auto border rounded bg-white p-2">
                    {filteredStudents.map((s) => (
                      <div
                        key={s.student_no}
                        className="flex items-center gap-2 py-1 cursor-move hover:bg-gray-100 px-1"
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.effectAllowed = "copy";
                          setDraggedStudent(s.student_no);
                        }}
                        onDragEnd={() => setDraggedStudent(null)}
                      >
                        <input
                          type="checkbox"
                          checked={selectedStudentNos.includes(s.student_no)}
                          onChange={(e) => {
                            setSelectedStudentNos(prev =>
                              e.target.checked ? [...prev, s.student_no] : prev.filter(x => x !== s.student_no)
                            );
                          }}
                        />
                        <div className="text-sm">
                          {s.student_no} <span className="text-gray-600">{s.name}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 flex justify-end">
                    <button
                      onClick={addSelectedStudents}
                      className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                    >
                      → 加入
                    </button>
                  </div>
                </div>

                {/* Middle: Add/Remove Buttons */}
                <div className="col-span-1 flex flex-col justify-center items-center gap-2">
                  <button
                    onClick={addSelectedStudents}
                    className="px-3 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                  >
                    →
                  </button>
                  <button
                    onClick={removeSelectedMembers}
                    className="px-3 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                  >
                    ←
                  </button>
                </div>

                {/* Right: Current Members */}
                <div className="col-span-1 bg-blue-50 p-3 border rounded">
                  <div className="font-medium text-sm mb-2">組員</div>
                  <div
                    className="max-h-64 overflow-auto border rounded bg-white p-2"
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = "copy";
                    }}
                    onDrop={async (e) => {
                      e.preventDefault();
                      if (draggedStudent) {
                        await addStudentByDrag(draggedStudent);
                      }
                    }}
                  >
                    {currentMembers.length === 0 ? (
                      <div className="text-sm text-gray-400 text-center py-8">拖拽學生到此或點加入</div>
                    ) : (
                      currentMembers.map((m) => (
                        <div key={m.id} className="flex items-center gap-2 py-1 hover:bg-gray-50 px-1">
                          <input
                            type="radio"
                            checked={m.is_leader}
                            onChange={() => toggleLeader(m.id, m.is_leader)}
                            name={`leader-${editingGroup.id}`}
                          />
                          <input
                            type="checkbox"
                            checked={selectedMemberIds.includes(m.id)}
                            onChange={(e) => {
                              setSelectedMemberIds(prev =>
                                e.target.checked ? [...prev, m.id] : prev.filter(x => x !== m.id)
                              );
                            }}
                          />
                          <div className="text-sm">
                            {m.student_no} {m.is_leader && <strong className="text-yellow-600">(組長)</strong>}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="mt-2 flex justify-end">
                    <button
                      onClick={removeSelectedMembers}
                      className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                    >
                      ← 移出
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 border-t flex justify-end gap-2">
              <button onClick={closeModal} className="px-4 py-2 bg-gray-300 text-black rounded hover:bg-gray-400">
                關閉
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
