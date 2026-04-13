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

  // Small sample accounts (fields follow TableSchema.md `accounts`)
  const samples: Account[] = [
    { student_no: "s001", name: "Alice", role: "student" },
    { student_no: "t001", name: "Teacher Tom", role: "teacher" },
    { student_no: "joery", name: "Joery (backdoor)", role: "admin" },
  ];

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    // Hardcoded backdoor account

      // If the account is one of the local sample/backdoor accounts, accept without password check
      const foundLocal = samples.find((s) => s.student_no === studentNo);
      if (foundLocal) {
        onLogin(foundLocal);
        return;
      }

    // Call server auth API which checks Supabase `accounts` table
    fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ student_no: studentNo, password }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data?.ok && data.user) {
          onLogin(data.user);
        } else {
          setError(data?.error || "登入失敗：帳密錯誤或帳號不存在。\n請確認已由教師匯入學生名單。");
        }
      })
      .catch((err) => setError(String(err)));
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-sm bg-white p-6 rounded shadow"
    >
      <h2 className="text-xl font-semibold mb-4">登入</h2>

      <label className="block text-sm mb-1">帳號 (學號)</label>
      <input
        value={studentNo}
        onChange={(e) => setStudentNo(e.target.value)}
        className="w-full mb-3 px-3 py-2 border rounded"
        placeholder="例：s001 或 joery"
        aria-label="student_no"
      />

      <label className="block text-sm mb-1">密碼</label>
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="w-full mb-3 px-3 py-2 border rounded"
        placeholder="密碼"
        aria-label="password"
      />

      {error && <div className="text-sm text-red-600 mb-3">{error}</div>}

      <button className="w-full bg-blue-600 text-white py-2 rounded">登入</button>

      <p className="mt-3 text-xs text-gray-600">
        預設帳號參考 TableSchema 中 `accounts` 欄位：student_no, name, role。
      </p>
    </form>
  );
}
