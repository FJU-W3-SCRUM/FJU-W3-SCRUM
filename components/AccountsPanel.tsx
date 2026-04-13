"use client";
import React, { useEffect, useState } from "react";
import ImportCsvForm from "./ImportCsvForm";

export default function AccountsPanel() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [classId, setClassId] = useState<string | null>(null);
  const [classes, setClasses] = useState<any[]>([]);

  async function loadClasses() {
    const res = await fetch("/api/classes");
    const j = await res.json();
    if (j.ok) setClasses(j.classes || []);
  }

  async function loadAccounts() {
    const params = new URLSearchParams();
    if (classId) params.set("class_id", String(classId));
    if (q) params.set("q", q);
    const res = await fetch(`/api/accounts?${params.toString()}`);
    const j = await res.json();
    if (j.ok) setAccounts(j.accounts || []);
  }

  useEffect(() => { loadClasses(); loadAccounts(); }, []);

  return (
    <div className="space-y-4">
      <div className="bg-white p-4 rounded shadow">
        <h3 className="font-medium mb-3">帳號管理</h3>
        <div className="flex gap-2 mb-3">
          <select value={classId ?? ""} onChange={(e) => setClassId(e.target.value || null)} className="border p-2 w-48">
            <option value="">全部班別</option>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.class_name}</option>)}
          </select>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="學號或姓名" className="border p-2 flex-1" />
          <button onClick={loadAccounts} className="px-3 py-1 bg-blue-600 text-white rounded">查詢</button>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="text-left">
              <th>學號</th><th>姓名</th><th>email</th><th>role</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((a) => (
              <tr key={a.student_no} className="border-t">
                <td className="py-1">{a.student_no}</td>
                <td>{a.name}</td>
                <td>{a.email}</td>
                <td>{a.role}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ImportCsvForm />
    </div>
  );
}
