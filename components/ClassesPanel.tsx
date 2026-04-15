"use client";
import React, { useEffect, useState } from "react";

export default function ClassesPanel() {
  const [classes, setClasses] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [year, setYear] = useState<number | "">(new Date().getFullYear());
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/classes");
    const j = await res.json();
    if (j.ok) setClasses(j.classes || []);
  }

  useEffect(() => { load(); }, []);

  async function createClass() {
    setError(null);
    const res = await fetch("/api/classes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ class_name: name, year }) });
    const j = await res.json();
    if (j.ok) { setName(""); load(); }
    else {
      setError(j.error || "建立班級失敗");
    }
  }

  async function deleteClass(id: number) {
    const res = await fetch("/api/classes", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    const j = await res.json();
    if (j.ok) load();
  }

  return (
    <div className="bg-white p-4 rounded shadow">
      <h3 className="font-medium mb-3">班別設定</h3>
      <div className="flex gap-2 mb-4">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="班級名稱" className="border p-2 flex-1" />
        <input value={String(year)} onChange={(e) => setYear(Number(e.target.value) || "")} placeholder="年度" className="border p-2 w-24" />
        <button onClick={createClass} className="px-3 py-1 bg-blue-600 text-white rounded">建立</button>
      </div>
      {error && <div className="text-sm text-red-600 mb-3">{error}</div>}

      <ul>
        {classes.map((c) => (
          <li key={c.id} className="flex justify-between py-1">
            <span>{c.class_name} ({c.year})</span>
            <div>
              <button onClick={() => deleteClass(c.id)} className="text-sm text-red-600">刪除</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
