"use client";
import React, { useEffect, useState } from "react";
import LoginForm, { Account } from "../components/LoginForm";
import AuthLayout from "../components/AuthLayout";

export default function Home() {
  const [user, setUser] = useState<Account | null>(null);

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
      <div className="flex items-center justify-center min-h-screen bg-zinc-50">
        <div className="w-full max-w-4xl p-8">
          <h1 className="text-2xl font-semibold mb-6">課堂即時互動評分系統 - 登入</h1>
          <div className="flex gap-8">
            <LoginForm onLogin={onLogin} />
            <div className="flex-1 bg-white p-6 rounded shadow">
              <h3 className="font-medium mb-2">說明</h3>
              <p className="text-sm text-gray-600">
                預設帳號為學號，密碼由教師設定並匯入系統。教師可匯入學生名單、建立分組、設定課堂模式與評分規則。學生登入後可查看個人資訊與分組狀態，並在課堂中參與互動評分。請確認已由教師匯入學生帳號後再嘗試登入。
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AuthLayout user={user} onLogout={onLogout}>
      <div>
        <h2 className="text-xl font-semibold">歡迎，{user.name ?? user.student_no}</h2>
        <p className="mt-2 text-sm text-gray-600">這裡是主畫面區塊，顯示課堂與操作內容。</p>
      </div>
    </AuthLayout>
  );
}
