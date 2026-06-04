"use client";

import React, { useEffect, useState } from 'react';

interface RatingDetail {
  id: number;
  star: number;
  rater_account_id?: number;
  rater_name?: string;
  rater_role?: string;
  source?: string;
  created_at?: string;
}

interface SessionRow {
  session_id: number;
  session_title: string;
  session_created_at?: string;
  raise_count: number;
  answer_count: number;
  score: number;
  ratings?: RatingDetail[];
}

export default function StudentScorePanel({ accountId }: { accountId: string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [total, setTotal] = useState({ raise: 0, answer: 0, score: 0 });
  const [sessions, setSessions] = useState<SessionRow[]>([]);

  useEffect(() => {
    fetchData();
  }, [accountId]);

  async function fetchData() {
    try {
      setLoading(true);
      setError('');
      const res = await fetch(`/api/students/history?accountId=${accountId}`);
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'fetch failed');
      setTotal({ raise: data.data.totalRaise, answer: data.data.totalAnswer, score: data.data.totalScore });
      setSessions(data.data.sessions || []);
    } catch (e: any) {
      setError(e.message || '無法取得資料');
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div>載入中...</div>;

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded shadow-md border border-gray-200 dark:border-gray-700 w-full">
      <h2 className="text-3xl font-bold mb-4 text-gray-900 dark:text-gray-100">總分: <span className="text-amber-600">⭐ {total.score}</span></h2>
      <p className="mb-4 text-sm text-gray-600">總舉手: {total.raise} · 總被點: {total.answer}</p>

      <h3 className="text-lg font-semibold mb-3">歷史明細</h3>
      {error && <div className="p-3 bg-red-50 text-red-700 rounded mb-3">{error}</div>}

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-100 dark:bg-gray-700">
              <th className="px-4 py-2 text-left">課堂</th>
              <th className="px-4 py-2 text-center">舉手</th>
              <th className="px-4 py-2 text-center">被點</th>
              <th className="px-4 py-2 text-center">分數</th>
              <th className="px-4 py-2">評分明細</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((s) => (
              <tr key={s.session_id} className="border-t border-gray-200 dark:border-gray-700">
                <td className="px-4 py-3">{s.session_title}</td>
                <td className="px-4 py-3 text-center">{s.raise_count}</td>
                <td className="px-4 py-3 text-center">{s.answer_count}</td>
                <td className="px-4 py-3 text-center font-bold text-amber-600">{s.score}</td>
                <td className="px-4 py-3">
                  {s.ratings && s.ratings.length > 0 ? (
                    <ul className="text-sm">
                      {s.ratings.map((r) => (
                        <li key={r.id} className="mb-1">
                          {r.star} 分 — {r.rater_name || '系統'}{r.rater_role ? ` ・${r.rater_role}` : ''} ({r.source || 'unknown'})
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <span className="text-sm text-gray-500">無評點</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
