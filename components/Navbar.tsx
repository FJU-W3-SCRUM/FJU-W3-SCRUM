"use client";
import React from "react";
import { useAuth } from "../hooks/useAuth";
import { signOut } from "../lib/supabase/auth";

const ROLE_LABEL: Record<string, string> = {
  teacher: "老師",
  student: "學生",
};

export default function Navbar() {
  const { profile, isLoading } = useAuth();
  const [signOutError, setSignOutError] = React.useState<string | null>(null);

  async function handleSignOut() {
    setSignOutError(null);
    try {
      await signOut();
    } catch {
      setSignOutError("登出失敗，請稍後再試。");
    }
  }

  return (
    <header className="w-full bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-700">
      <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
        <span className="font-semibold text-zinc-800 dark:text-zinc-100">
          輔大碩職 Agile - Scrum
        </span>

        <div className="flex items-center gap-4">
          {isLoading ? (
            <span className="text-sm text-zinc-400">載入中…</span>
          ) : profile ? (
            <>
              <span className="text-sm text-zinc-700 dark:text-zinc-200">
                {ROLE_LABEL[profile.role] ?? profile.role}｜
                <span className="font-medium">{profile.name}</span>
              </span>
              <button
                onClick={handleSignOut}
                className="text-sm text-red-500 hover:text-red-700 transition-colors"
              >
                登出
              </button>
            </>
          ) : (
            <a
              href="/login"
              className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
            >
              登入
            </a>
          )}
        </div>
      </div>
      {signOutError && (
        <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm text-center py-1">
          {signOutError}
        </div>
      )}
    </header>
  );
}
