"use client";
import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type Group = { id: number; group_name: string; class_id: number };
type Account = { student_no: string; name: string };
type Member = { id: number; student_no: string; name: string; is_leader: boolean };

export default function GroupEditPage() {
  const router = useRouter();
  const params = useParams();
  const groupId = Number(params.groupId);

  const [group, setGroup] = useState<Group | null>(null);
  const [className, setClassName] = useState("");
  const [allStudents, setAllStudents] = useState<Account[]>([]);
  const [currentMembers, setCurrentMembers] = useState<Member[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStudentNos, setSelectedStudentNos] = useState<string[]>([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState<number[]>([]);
  const [draggedStudent, setDraggedStudent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadGroupData();
  }, [groupId]);

  async function loadGroupData() {
    try {
      setError(null);
      setLoading(true);
      console.log("Loading group data for groupId:", groupId);

      // Get group info
      const groupRes = await fetch(`/api/groups?id=${groupId}`);
      const groupData = await groupRes.json();
      console.log("Group data response:", groupData);
      if (!groupData.ok || !groupData.groups?.[0]) {
        setError("無法加載組別信息");
        return;
      }

      const g = groupData.groups[0];
      console.log("Got group:", g);
      setGroup(g);

      // Get class info
      const classRes = await fetch(`/api/classes?id=${g.class_id}`);
      const classData = await classRes.json();
      console.log("Class data response:", classData);
      if (classData.ok && classData.classes?.[0]) {
        setClassName(classData.classes[0].class_name);
      }

      // Load ungrouped students and members
      console.log("Loading ungrouped students and members...");
      await Promise.all([
        loadUngroupedStudents(g.class_id, g.id),
        loadMembers(g.id)
      ]);
    } catch (e: any) {
      console.error("loadGroupData error:", e);
      setError(e.message || "加載失敗");
    } finally {
      setLoading(false);
    }
  }

  async function loadUngroupedStudents(classId: number, gid: number) {
    try {
      const res = await fetch(`/api/ungrouped-students?class_id=${classId}&group_id=${gid}`);
      const j = await res.json();
      console.log("loadUngroupedStudents response:", j);
      if (j.ok) {
        setAllStudents(j.students || []);
      } else {
        console.error("Error loading ungrouped students:", j.error);
        setError(`加載未分組學生失敗: ${j.error}`);
      }
    } catch (e: any) {
      console.error("loadUngroupedStudents exception:", e);
      setError(`加載未分組學生異常: ${e.message}`);
    }
  }

  async function loadMembers(gid: number) {
    try {
      const res = await fetch(`/api/group_members?group_id=${gid}`);
      const j = await res.json();
      console.log("loadMembers response:", j);
      if (j.ok) {
        setCurrentMembers(j.members || []);
      } else {
        console.error("Error loading members:", j.error);
        setError(`加載成員失敗: ${j.error}`);
      }
    } catch (e: any) {
      console.error("loadMembers exception:", e);
      setError(`加載成員異常: ${e.message}`);
    }
  }

  async function addSelectedStudents() {
    if (!group) return;
    for (const sno of selectedStudentNos) {
      await fetch("/api/group_members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ group_id: group.id, student_no: sno })
      });
    }
    setSelectedStudentNos([]);
    await loadMembers(group.id);
    await loadUngroupedStudents(group.class_id, group.id);
  }

  async function addStudentByDrag(studentNo: string) {
    if (!group) return;
    const res = await fetch("/api/group_members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ group_id: group.id, student_no: studentNo })
    });
    if (res.ok) {
      await loadMembers(group.id);
      await loadUngroupedStudents(group.class_id, group.id);
      setDraggedStudent(null);
    }
  }

  async function removeSelectedMembers() {
    if (!group) return;
    for (const id of selectedMemberIds) {
      await fetch("/api/group_members", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
      });
    }
    setSelectedMemberIds([]);
    await loadMembers(group.id);
    await loadUngroupedStudents(group.class_id, group.id);
  }

  async function toggleLeader(memberId: number, isLeader: boolean) {
    await fetch("/api/group_members", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: memberId, is_leader: !isLeader })
    });
    if (group) await loadMembers(group.id);
  }

  const filteredStudents = allStudents.filter(s => {
    const query = searchQuery.toLowerCase();
    const alreadyMember = currentMembers.some(m => m.student_no === s.student_no);
    const matchQuery = !query || s.student_no.toLowerCase().includes(query) || s.name.toLowerCase().includes(query);
    return !alreadyMember && matchQuery;
  });

  if (loading) {
    return (
      <div className="p-4 bg-white rounded shadow">
        <div className="text-center text-gray-500">加載中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-white rounded shadow">
        <div className="text-red-600 mb-4">{error}</div>
        <button onClick={() => router.back()} className="px-4 py-2 bg-gray-300 rounded">
          返回
        </button>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="p-4 bg-white rounded shadow">
        <div className="text-gray-500 mb-4">未找到組別</div>
        <button onClick={() => router.back()} className="px-4 py-2 bg-gray-300 rounded">
          返回
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white rounded shadow">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">編輯組別</h1>
        <div className="text-gray-600 space-y-1">
          <p><strong>班級：</strong>{className}</p>
          <p><strong>組別：</strong>{group.group_name}</p>
        </div>
      </div>

      {/* Search */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">搜尋學生</label>
        <input
          type="text"
          placeholder="學號或姓名"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full p-2 border rounded"
        />
      </div>

      {/* Left and Right Lists */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {/* Left: Ungrouped Students */}
        <div className="col-span-1 bg-gray-50 p-3 border rounded">
          <div className="font-medium text-sm mb-2">未分組學生</div>
          <div className="max-h-96 overflow-auto border rounded bg-white p-2">
            {filteredStudents.length === 0 ? (
              <div className="text-sm text-gray-400 text-center py-8">無未分組學生</div>
            ) : (
              filteredStudents.map((s) => (
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
                    <span className="font-medium">{s.student_no}</span> <span className="text-gray-600">{s.name}</span>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="mt-2 flex justify-end">
            <button
              onClick={addSelectedStudents}
              disabled={selectedStudentNos.length === 0}
              className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400"
            >
              → 加入
            </button>
          </div>
        </div>

        {/* Middle: Add/Remove Buttons */}
        <div className="col-span-1 flex flex-col justify-center items-center gap-2">
          <button
            onClick={addSelectedStudents}
            disabled={selectedStudentNos.length === 0}
            className="px-3 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400"
          >
            →
          </button>
          <button
            onClick={removeSelectedMembers}
            disabled={selectedMemberIds.length === 0}
            className="px-3 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-400"
          >
            ←
          </button>
        </div>

        {/* Right: Current Members */}
        <div className="col-span-1 bg-blue-50 p-3 border rounded">
          <div className="font-medium text-sm mb-2">組員</div>
          <div
            className="max-h-96 overflow-auto border rounded bg-white p-2"
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
                    name={`leader-${group.id}`}
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
                    <span className="font-medium">{m.student_no}</span> <span className="text-gray-600">{m.name}</span> {m.is_leader && <strong className="text-yellow-600">(組長)</strong>}
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="mt-2 flex justify-end">
            <button
              onClick={removeSelectedMembers}
              disabled={selectedMemberIds.length === 0}
              className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-400"
            >
              ← 移出
            </button>
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <button onClick={() => router.back()} className="px-4 py-2 bg-gray-300 text-black rounded hover:bg-gray-400">
          返回
        </button>
      </div>
    </div>
  );
}
