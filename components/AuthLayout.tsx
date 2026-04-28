"use client";
import React from "react";

import { useState } from "react";
import dynamic from "next/dynamic";

const ImportCsvForm = dynamic(() => import("./ImportCsvForm"), { ssr: false });
const GroupsPanel = dynamic(() => import("./GroupsPanel"), { ssr: false });
const AccountsPanel = dynamic(() => import("./AccountsPanel"), { ssr: false });
const ClassesPanel = dynamic(() => import("./ClassesPanel"), { ssr: false });
const ReportModePanel = dynamic(() => import("./ReportModePanel"), { ssr: false });
const ClassModePanel = dynamic(() => import("./ClassModePanel"), { ssr: false });

export default function AuthLayout({
  user,
  children,
  onLogout,
}: {
  user: { id?: string; student_no: string; name?: string; role?: string } | null;
  children: React.ReactNode;
  onLogout: () => void;
}) {
  // Get menu items based on user role
  const getMenuItems = () => {
    const adminTeacherMenu = [
      { key: "classes", label: "班別設定" },
      { key: "groups", label: "分組設定" },
      { key: "accounts", label: "帳號管理" },
      { key: "class_mode", label: "上課模式" },
      { key: "report_mode", label: "報告模式" },
    ];

    const studentMenu = [
      { key: "class_mode", label: "上課模式" },
      { key: "report_mode", label: "報告模式" },
    ];

    // admin 和 teacher 顯示完整菜單，其他角色（包括 student）顯示學生菜單
    const role = user?.role?.toLowerCase() || "student";
    if (role === "admin" || role === "teacher") {
      return adminTeacherMenu;
    }
    return studentMenu;
  };

  const menu = getMenuItems();

  const [open, setOpen] = useState(false);

  const [active, setActive] = useState<string>("home");

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-white dark:bg-gray-900">
      {/* Top bar for small screens */}
      <header className="w-full bg-[#003366] dark:bg-blue-900 text-white md:hidden flex items-center justify-between px-4 py-3 shadow-md">
        <div className="font-bold">學校互動評分系統</div>
        <div className="flex items-center gap-3">
          <div className="text-sm">{user?.name ?? user?.student_no}</div>
          <button 
            onClick={() => setOpen((v) => !v)} 
            className="px-2 py-1 bg-[#D4AF37] dark:bg-amber-500 text-[#003366] dark:text-blue-900 rounded hover:opacity-90 transition-opacity"
          >
            菜單
          </button>
        </div>
      </header>

      {/* Sidebar overlay for small screens */}
      {open && (
        <div className="md:hidden fixed inset-0 bg-black/40 z-40" onClick={() => setOpen(false)} />
      )}

      <aside className={`bg-white dark:bg-gray-800 md:w-64 p-4 z-50 border-r border-gray-200 dark:border-gray-700 ${
        open ? "fixed inset-y-0 left-0 w-64" : "hidden md:block"
      }`}>
        <div className="mb-6 border-b border-gray-200 dark:border-gray-700 pb-4">
          <div className="font-medium text-[#003366] dark:text-blue-400 text-sm">{user?.name ?? user?.student_no}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">學號: {user?.student_no}</div>
          <div className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 inline-block px-2 py-1 rounded mt-2">
            {user?.role === "admin" ? "管理員" : user?.role === "teacher" ? "教師" : "學生"}
          </div>
        </div>

        <nav className="space-y-2">
          {menu.map((m) => (
            <div 
              key={m.key} 
              onClick={() => { setActive(m.key); setOpen(false); }} 
              className={`py-2 px-3 text-sm rounded cursor-pointer transition-colors ${
                active === m.key 
                  ? 'font-semibold text-white bg-[#003366] dark:bg-blue-700' 
                  : 'text-[#003366] dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              {m.label}
            </div>
          ))}
        </nav>

        <div className="mt-6">
          <button
            onClick={onLogout}
            className="text-sm text-white px-3 py-2 rounded bg-red-600 dark:bg-red-700 hover:bg-red-700 dark:hover:bg-red-600 w-full transition-colors"
          >
            登出
          </button>
        </div>
      </aside>

      <main className="flex-1 p-6 bg-gray-50 dark:bg-gray-900 transition-colors">
        {active === "home" && children}
        {active === "accounts" && <AccountsPanel />}
        {active === "classes" && <ClassesPanel />}
        {active === "import" && <ImportCsvForm />}
        {active === "groups" && <GroupsPanel />}
        {active === "class_mode" && <ClassModePanel user={user} />}
        {active === "report_mode" && (
          <ReportModePanel user={user as any} />
        )}
      </main>
    </div>
  );
}
