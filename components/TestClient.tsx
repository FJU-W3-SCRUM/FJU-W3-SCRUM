"use client";
import React from "react";
import { useTest } from "../hooks/useTest";

export default function TestClient() {
  const { data, isLoading, error } = useTest();

  if (isLoading) return <div className="mt-4">載入中…</div>;
  if (error)
    return (
      <div className="mt-4 text-red-600">
        錯誤: {String(error?.message ?? error)}
      </div>
    );

  if (!data || data.length === 0)
    return (
      <div className="mt-4 text-zinc-600">
        目前沒有資料😭請確認：
        <ul className="list-disc list-inside ml-4 mt-2">
          <li>
            已設定 `NEXT_PUBLIC_SUPABASE_URL` 與
            `NEXT_PUBLIC_SUPABASE_ANON_KEY`。
          </li>
          <li>Supabase 專案中存在 `test` 表且有資料。</li>
          <li>若為私有表，請確認 API 權限允許匿名讀取。</li>
        </ul>
      </div>
    );

  return (
    <div className="mt-6 w-full">
      <h3 className="text-lg font-medium">Test 資料</h3>
      <ul className="mt-2 list-disc list-inside">
        {data.map((row: any) => (
          <li key={row.id} className="py-1">
            <span className="font-semibold">{row.id}</span>:{" "}
            {String(row.text ?? "(null)")}
            <span className="ml-2 text-zinc-500">{row.created_at}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
