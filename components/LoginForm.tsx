"use client";
import React, { useState } from "react";

export type Account = {
  student_no: string;
  name?: string;
  role?: "teacher" | "student" | "admin";
};

export default function LoginForm({
  onLogin,
}: {
  onLogin: (acct: Account) => void;
}) {
  const [studentNo, setStudentNo] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // Call server auth API which checks Supabase `accounts` table
    fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ student_no: studentNo, password }),
    })
      .then((r) => r.json())
      .then((data) => {
        setLoading(false);
        if (data?.ok && data.user) {
          onLogin(data.user);
        } else {
          setError(data?.error || "登入失敗：帳密錯誤或帳號不存在。\n請確認已由教師匯入學生名單。");
        }
      })
      .catch((err) => {
        setLoading(false);
        setError(String(err));
      });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-sm bg-white dark:bg-gray-800 p-6 rounded shadow-lg border border-gray-200 dark:border-gray-700"
    >
      <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">登入</h2>

      <label className="block text-sm mb-1 font-medium text-gray-700 dark:text-gray-300">帳號 (學號)</label>
      <input
        value={studentNo}
        onChange={(e) => setStudentNo(e.target.value)}
        className="w-full mb-3 px-3 py-2 border rounded bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder="例：joery 或 st01"
        aria-label="student_no"
        required
      />

      <label className="block text-sm mb-1 font-medium text-gray-700 dark:text-gray-300">密碼</label>
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="w-full mb-3 px-3 py-2 border rounded bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder="密碼（可選）"
        aria-label="password"
      />

      {error && (
        <div className="text-sm text-red-600 dark:text-red-400 mb-3 bg-red-50 dark:bg-red-900/20 p-2 rounded">
          {error}
        </div>
      )}

      <button 
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 dark:bg-blue-700 text-white py-2 rounded hover:bg-blue-700 dark:hover:bg-blue-600 disabled:bg-gray-400 dark:disabled:bg-gray-600 transition-colors"
      >
        {loading ? "登入中..." : "登入"}
      </button>

      <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded text-xs text-gray-700 dark:text-gray-300">
        <p className="font-medium mb-1">後門帳號（測試用）：</p>
        <ul className="list-disc ml-4 space-y-1">
          <li>帳號：joery，密碼：1234（管理員）</li>
          <li>帳號：st01，密碼：1234（學生）</li>
          <li>可以不用密碼直接登入</li>
        </ul>
      </div>
    </form>
  );
}
