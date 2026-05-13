'use client';

import { useState } from 'react';

export default function TestSeatSelectPage() {
  const [sessionId, setSessionId] = useState('');
  const [accountId, setAccountId] = useState('');
  const [row, setRow] = useState('0');
  const [col, setCol] = useState('0');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleTest = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/class-mode/select-seat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, row: Number(row), col: Number(col), actorAccountId: accountId })
      });
      const data = await res.json().catch(() => ({ status: res.status }));
      setResult({ ok: res.ok, status: res.status, data });
    } catch (e) {
      setResult({ error: String(e) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">測試：選位 API (/api/class-mode/select-seat)</h1>
      <div className="grid grid-cols-2 gap-3 max-w-xl">
        <label>
          Session ID
          <input className="w-full p-2 border rounded mt-1" value={sessionId} onChange={e => setSessionId(e.target.value)} />
        </label>
        <label>
          Account ID
          <input className="w-full p-2 border rounded mt-1" value={accountId} onChange={e => setAccountId(e.target.value)} />
        </label>
        <label>
          Row
          <input className="w-full p-2 border rounded mt-1" value={row} onChange={e => setRow(e.target.value)} />
        </label>
        <label>
          Col
          <input className="w-full p-2 border rounded mt-1" value={col} onChange={e => setCol(e.target.value)} />
        </label>
      </div>

      <div className="mt-4">
        <button onClick={handleTest} disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded">
          {loading ? '測試中...' : '執行選位'}
        </button>
      </div>

      <div className="mt-6">
        <h2 className="font-semibold">回傳結果：</h2>
        <pre className="p-3 bg-gray-100 rounded max-w-3xl overflow-auto">{JSON.stringify(result, null, 2)}</pre>
        <p className="text-sm text-gray-600 mt-2">說明：若你在瀏覽器執行此頁面，API 會呼叫伺服端路由，並嘗試寫入 `session_seats`。請在資料庫確認資料是否已寫入。</p>
      </div>
    </div>
  );
}
