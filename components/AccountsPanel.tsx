"use client";
import React, { useEffect, useState } from "react";
import ImportCsvForm from "./ImportCsvForm";

export default function AccountsPanel() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [classId, setClassId] = useState<string | null>(null);
  const [classes, setClasses] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  async function loadClasses() {
    const res = await fetch("/api/classes");
    const j = await res.json();
    if (j.ok) setClasses(j.classes || []);
  }

  async function loadAccounts() {
    const params = new URLSearchParams();
    if (classId) params.set("class_id", String(classId));
    if (q) params.set("q", q);
    params.set("page", String(page));
    params.set("page_size", String(pageSize));
    const res = await fetch(`/api/accounts?${params.toString()}`);
    const j = await res.json();
    if (j.ok) {
      setAccounts(j.accounts || []);
      setTotalCount(j.totalCount || 0);
      setTotalPages(j.totalPages || 0);
    }
  }

  useEffect(() => { loadClasses(); }, []);
  
  // Refresh accounts list when page, pageSize, classId or q changes
  useEffect(() => {
    const handler = setTimeout(() => {
      setPage(1); // Reset to first page when filters change
      loadAccounts();
    }, 300); // Debounce search
    return () => clearTimeout(handler);
  }, [classId, q]);
  
  // Load accounts when page or pageSize changes
  useEffect(() => {
    loadAccounts();
  }, [page, pageSize]);

  return (
    <div className="space-y-4">
      <ImportCsvForm onImportSuccess={loadAccounts} />

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

        <div className="mb-3 flex items-center gap-2">
          <label className="text-sm">每頁顯示:</label>
          <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))} className="border p-1 text-sm">
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <span className="text-sm text-gray-600 ml-auto">共 {totalCount} 筆 / 第 {page} / {totalPages} 頁</span>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="text-left bg-gray-100">
              <th className="px-2 py-1">班別</th><th className="px-2 py-1">學號</th><th className="px-2 py-1">姓名</th><th className="px-2 py-1">email</th><th className="px-2 py-1">role</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((a) => (
              <tr key={a.id} className="border-t hover:bg-gray-50">
                <td className="px-2 py-1">{a.class_name || '-'}</td>
                <td className="px-2 py-1">{a.student_no}</td>
                <td className="px-2 py-1">{a.name}</td>
                <td className="px-2 py-1 text-xs">{a.email}</td>
                <td className="px-2 py-1">{a.role}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-3 flex gap-2 justify-center">
          <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="px-2 py-1 bg-gray-200 rounded disabled:opacity-50">← 上一頁</button>
          <span className="px-2 py-1">第 {page} 頁</span>
          <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages} className="px-2 py-1 bg-gray-200 rounded disabled:opacity-50">下一頁 →</button>
        </div>
      </div>
    </div>
  );
}
