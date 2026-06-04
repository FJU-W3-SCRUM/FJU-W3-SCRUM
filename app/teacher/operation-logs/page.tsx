"use client";
import React, { useEffect, useState } from 'react';

export default function Page() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchLogs(); }, []);

  async function fetchLogs() {
    setLoading(true);
    try {
      const res = await fetch('/api/operation-logs');
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'fetch failed');
      setLogs(data.data || []);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">操作日誌</h1>
      {loading ? <div>載入中...</div> : (
        <div className="bg-white dark:bg-gray-800 p-4 rounded border">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-100 dark:bg-gray-700">
                <th className="px-4 py-2">時間</th>
                <th className="px-4 py-2">使用者</th>
                <th className="px-4 py-2">動作</th>
                <th className="px-4 py-2">資源</th>
                <th className="px-4 py-2">內容</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id} className="border-t border-gray-200 dark:border-gray-700">
                  <td className="px-4 py-2">{l.created_at}</td>
                  <td className="px-4 py-2">{l.account_id}</td>
                  <td className="px-4 py-2">{l.action_type}</td>
                  <td className="px-4 py-2">{l.resource_type}#{l.resource_id}</td>
                  <td className="px-4 py-2"><pre className="text-xs">{JSON.stringify(l.payload)}</pre></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
