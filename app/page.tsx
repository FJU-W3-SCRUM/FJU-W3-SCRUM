"use client";
import React, { useEffect, useState } from "react";
import LoginForm, { Account } from "../components/LoginForm";
import AuthLayout from "../components/AuthLayout";
import ReportModePanel from "../components/ReportModePanel";
import ScoreQueryPanel from "../components/ScoreQueryPanel";

export default function Home() {
  const [user, setUser] = useState<Account | null>(null);
  const [activeTab, setActiveTab] = useState<"dashboard" | "report" | "query">("dashboard");

  // Disable auto-login: ensure any persisted user is cleared on page load
  useEffect(() => {
    try {
      localStorage.removeItem("ch_user");
    } catch (e) {
      // ignore
    }
  }, []);

  function onLogin(a: Account) {
    setUser(a);
    localStorage.setItem("ch_user", JSON.stringify(a));
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
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            歡迎，{user.name ?? user.student_no}
          </h2>
          <div className="flex gap-6 mt-4 text-sm flex-wrap text-gray-600 dark:text-gray-400">
            <div>
              <span className="text-gray-500 dark:text-gray-400">學號：</span>
              <span className="font-medium text-gray-900 dark:text-gray-100 ml-1">{user.student_no}</span>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">身分：</span>
              <span className="font-medium text-gray-900 dark:text-gray-100 ml-1">{roleText}</span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700 mb-6 flex-wrap">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`px-4 py-3 font-semibold transition-colors border-b-2 -mb-px ${
              activeTab === "dashboard"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
            }`}
          >
            🏠 首頁
          </button>
          <button
            onClick={() => setActiveTab("report")}
            className={`px-4 py-3 font-semibold transition-colors border-b-2 -mb-px ${
              activeTab === "report"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
            }`}
          >
            📊 報告模式
          </button>
          <button
            onClick={() => setActiveTab("query")}
            className={`px-4 py-3 font-semibold transition-colors border-b-2 -mb-px ${
              activeTab === "query"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
            }`}
          >
            📈 分數查詢
          </button>
        </div>

        {/* Content Area */}
        {activeTab === "dashboard" && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded shadow-lg border border-gray-200 dark:border-gray-700">
              <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">📖 系統說明</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                課堂即時互動評分系統提供兩大功能：
              </p>
              <ul className="space-y-3 text-gray-600 dark:text-gray-400">
                <li>• <strong className="text-gray-900 dark:text-gray-100">報告模式</strong>：選擇班別和報告組，開始課堂互動。系統自動計算學生舉手次數、被點次數和評點分數。</li>
                <li>• <strong className="text-gray-900 dark:text-gray-100">分數查詢</strong>：查詢學生的歷史成績統計。老師可查詢全校所有班級，學生只能查詢同班成績。</li>
              </ul>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Task01 Info */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-6">
                <h3 className="text-lg font-bold text-blue-900 dark:text-blue-200 mb-3">
                  📊 Task01 - 報告模式分數顯示
                </h3>
                <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-2">
                  <li>✅ 選擇班別和報告組</li>
                  <li>✅ 點擊「開始報告」進入互動模式</li>
                  <li>✅ 自動加載和顯示分組成員分數</li>
                  <li>✅ 實時更新分數統計</li>
                  <li>✅ 格式: (被點/舉手; 分數)</li>
                </ul>
              </div>

              {/* Task02 Info */}
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-6">
                <h3 className="text-lg font-bold text-green-900 dark:text-green-200 mb-3">
                  📈 Task02 - 分數查詢功能
                </h3>
                <ul className="text-sm text-green-800 dark:text-green-300 space-y-2">
                  <li>✅ 老師: 查詢全校所有班級</li>
                  <li>✅ 學生: 限查同班學生</li>
                  <li>✅ 班別篩選和關鍵字搜尋</li>
                  <li>✅ 結果按課堂自動分組</li>
                  <li>✅ 統計摘要 (舉手、被點、分數)</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {activeTab === "report" && (
          <div className="bg-white dark:bg-gray-800 rounded shadow-lg border border-gray-200 dark:border-gray-700 p-6">
            <ReportModePanel user={user as any} />
          </div>
        )}

        {activeTab === "query" && (
          <div className="bg-white dark:bg-gray-800 rounded shadow-lg border border-gray-200 dark:border-gray-700">
            <ScoreQueryPanel user={user as any} />
          </div>
        )}
      </div>
    </AuthLayout>
  );
}
