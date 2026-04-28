"use client";
import React, { useEffect, useState } from "react";
import LoginForm, { Account } from "../components/LoginForm";
import AuthLayout from "../components/AuthLayout";

export default function Home() {
  const [user, setUser] = useState<Account | null>(null);

  // On initial load, try to load user from localStorage
  useEffect(() => {
    const storedUser = localStorage.getItem("ch_user");
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        // If parsing fails, remove the invalid item
        localStorage.removeItem("ch_user");
      }
    }
  }, []);

  function onLogin(a: Account) {
    localStorage.setItem("ch_user", JSON.stringify(a));
    // setUser(a); // This will be handled by the page reload and useEffect
    window.location.reload(); // Reload to apply AuthLayout and other user-dependent states
  }

  function onLogout() {
    setUser(null);
    localStorage.removeItem("ch_user");
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white dark:bg-gray-900">
        <div className="w-full max-w-4xl p-8">
          <h1 className="text-2xl font-semibold mb-6 text-gray-900 dark:text-gray-100">課堂即時互動評分系統 - 登入</h1>
          <div className="flex gap-8 flex-col md:flex-row">
            <LoginForm onLogin={onLogin} />
            <div className="flex-1 bg-white dark:bg-gray-800 p-6 rounded shadow-lg border border-gray-200 dark:border-gray-700">
              <h3 className="font-medium mb-2 text-gray-900 dark:text-gray-100">系統說明</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                預設帳號為學號，密碼由教師設定並匯入系統。教師可匯入學生名單、建立分組、設定課堂模式與評分規則。學生登入後可查看個人資訊與分組狀態，並在課堂中參與互動評分。請確認已由教師匯入學生帳號後再嘗試登入。
              </p>
              <hr className="my-4 border-gray-300 dark:border-gray-600" />
              <h4 className="font-medium text-sm mb-2 text-gray-900 dark:text-gray-100">系統功能</h4>
              <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                <li><strong className="text-gray-900 dark:text-gray-200">管理員/教師：</strong></li>
                <li className="ml-4">• 班別設定 - 管理課堂班級</li>
                <li className="ml-4">• 分組設定 - 設定學生分組</li>
                <li className="ml-4">• 帳號管理 - 匯入和管理學生帳號</li>
                <li className="ml-4">• 上課模式 - 課堂互動管理</li>
                <li className="ml-4">• 報告模式 - 報告展示管理</li>
                <li className="mt-2"><strong className="text-gray-900 dark:text-gray-200">學生：</strong></li>
                <li className="ml-4">• 上課模式 - 參與課堂互動</li>
                <li className="ml-4">• 報告模式 - 查看報告展示</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const roleText = user.role === "admin" ? "管理員" : user.role === "teacher" ? "教師" : "學生";

  return (
    <AuthLayout user={user} onLogout={onLogout}>
      <div className="bg-white dark:bg-gray-800 p-6 rounded shadow-lg border border-gray-200 dark:border-gray-700">
        <h2 className="text-2xl font-semibold mb-2 text-gray-900 dark:text-gray-100">歡迎，{user.name ?? user.student_no}</h2>
        <div className="flex gap-6 mt-4 text-sm flex-wrap">
          <div>
            <span className="text-gray-500 dark:text-gray-400">學號：</span>
            <span className="font-medium text-gray-900 dark:text-gray-100">{user.student_no}</span>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400">身分：</span>
            <span className="font-medium text-gray-900 dark:text-gray-100">{roleText}</span>
          </div>
        </div>
        <p className="mt-4 text-gray-600 dark:text-gray-400">這裡是主畫面區塊，顯示課堂與操作內容。</p>
      </div>
    </AuthLayout>
  );
}
