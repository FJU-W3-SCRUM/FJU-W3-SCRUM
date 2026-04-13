"use client";
import React from "react";

import { useState } from "react";
import dynamic from "next/dynamic";

const ImportCsvForm = dynamic(() => import("./ImportCsvForm"), { ssr: false });
const GroupsPanel = dynamic(() => import("./GroupsPanel"), { ssr: false });

export default function AuthLayout({
  user,
  children,
  onLogout,
}: {
  user: { student_no: string; name?: string; role?: string } | null;
  children: React.ReactNode;
  onLogout: () => void;
}) {
  const menu = [
    { key: "accounts", label: "帳號管理" },
    { key: "groups", label: "分組設定" },
    { key: "class_mode", label: "上課模式" },
    { key: "report_mode", label: "報告模式" },
  ];

  const [open, setOpen] = useState(false);

  const [active, setActive] = useState<string>("home");

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Top bar for small screens */}
      <header className="w-full bg-[#003366] text-white md:hidden flex items-center justify-between px-4 py-3">
        <div className="font-bold">學校互動評分系統</div>
        <div className="flex items-center gap-3">
          <div className="text-sm">{user?.name ?? user?.student_no}</div>
          <button onClick={() => setOpen((v) => !v)} className="px-2 py-1 bg-[#D4AF37] text-[#003366] rounded">
            菜單
          </button>
        </div>
      </header>

      {/* Sidebar overlay for small screens */}
      {open && (
        <div className="md:hidden fixed inset-0 bg-black/40 z-40" onClick={() => setOpen(false)} />
      )}

      <aside className={`bg-white md:w-64 p-4 z-50 ${open ? "fixed inset-y-0 left-0 w-64" : "hidden md:block"}`}>
        <div className="mb-6">
          <div className="font-medium text-[#003366]">{user?.name ?? user?.student_no}</div>
          <div className="text-sm text-gray-500">{user?.role ?? "student"}</div>
        </div>

        <nav className="space-y-2">
          {menu.map((m) => (
            <div key={m.key} onClick={() => { setActive(m.key); setOpen(false); }} className={`py-2 text-sm ${active===m.key? 'font-semibold text-black': 'text-[#003366] hover:text-black'} cursor-pointer`}>
              {m.label}
            </div>
          ))}
        </nav>

        <div className="mt-6">
          <button
            onClick={onLogout}
            className="text-sm text-white px-3 py-1 rounded bg-red-600"
          >
            登出
          </button>
        </div>
      </aside>

      <main className="flex-1 p-6 bg-gradient-to-b from-white to-zinc-50">
        {active === "home" && children}
        {active === "import" && <ImportCsvForm />}
        {active === "groups" && <GroupsPanel />}
        {active === "class_mode" && <div className="bg-white p-4 rounded shadow">上課模式設定（待實作）</div>}
        {active === "report_mode" && <div className="bg-white p-4 rounded shadow">報告模式設定（待實作）</div>}
      </main>
    </div>
  );
}
