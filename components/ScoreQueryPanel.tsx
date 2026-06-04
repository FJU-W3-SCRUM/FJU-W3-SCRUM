/**
 * Task02: Score Query Panel
 * 
 * 分數查詢功能組件
 * - 老師可查詢所有班別的所有學生成績
 * - 學生只能查詢同班成績
 * - 支持班別篩選和關鍵字搜尋
 */

"use client";

import React, { useEffect, useState } from "react";
import type { StudentScoreQueryResult } from "@/lib/services/score-query-service";
import AdjustScoreModal from "./AdjustScoreModal";

interface ScoreQueryPanelProps {
  user: {
    id: string;
    student_no?: string;
    role?: string;
    name?: string;
  };
}

interface ClassOption {
  id: string;
  name: string;
}

export default function ScoreQueryPanel({ user }: ScoreQueryPanelProps) {
  const role = user?.role?.toLowerCase() || "student";
  const userId = user?.id;

  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [keyword, setKeyword] = useState<string>("");
  const [results, setResults] = useState<StudentScoreQueryResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string>("");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalStudent, setModalStudent] = useState<null | { account_id: string; session_id: string; totalScore: number }>(null);
  const [exportFormat, setExportFormat] = useState<'csv' | 'xlsx' | 'xlsx_paged'>('csv');
  const [includeRatings, setIncludeRatings] = useState(false);

  // Load available classes for user
  useEffect(() => {
    loadClasses();
  }, [role, userId]);

  const loadClasses = async () => {
    try {
      setLoading(true);
      setError("");

      const endpoint =
        role === "admin"
          ? "/api/scores/query/teacher-classes"
          : "/api/scores/query/student-classes";

      console.log('[ScoreQueryPanel.loadClasses] Fetching from', endpoint, 'with', {
        userRole: role,
        userId
      });

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          role === "admin" ? { teacherId: userId } : { studentId: userId }
        ),
      });

      console.log('[ScoreQueryPanel.loadClasses] Response status:', response.status);

      const data = await response.json();

      console.log('[ScoreQueryPanel.loadClasses] Response data:', data);

      if (!data.ok) {
        throw new Error(data.error || "Failed to load classes");
      }

      console.log('[ScoreQueryPanel.loadClasses] Classes loaded:', data.data?.length || 0);
      setClasses(data.data || []);

      // Auto-select first class
      if (data.data && data.data.length > 0) {
        setSelectedClassId(data.data[0].id);
      }
    } catch (err: any) {
      console.error("[ScoreQueryPanel.loadClasses] Error:", err);
      setError(err.message || "無法加載班級列表");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setIsSearching(true);
      setError("");

      const params = new URLSearchParams();
      params.append("userId", userId);
      params.append("userRole", role);
      if (selectedClassId) {
        params.append("classId", selectedClassId);
      }
      if (keyword) {
        params.append("keyword", keyword);
      }

      console.log('[ScoreQueryPanel] Search params:', {
        userId,
        role,
        selectedClassId,
        keyword
      });

      const response = await fetch(`/api/scores/query?${params.toString()}`);
      console.log('[ScoreQueryPanel] Response status:', response.status);
      
      let data: any;
      try {
        data = await response.json();
      } catch (e) {
        const text = await response.text();
        console.error('[ScoreQueryPanel] JSON parse error:', e);
        throw new Error(text || 'Invalid JSON response from server');
      }

      console.log('[ScoreQueryPanel] Response data:', data);

      if (!data.ok) {
        throw new Error(data.error || "Query failed");
      }

      console.log('[ScoreQueryPanel] Results count:', data.data?.length || 0);
      setResults(data.data || []);

      if (data.data && data.data.length === 0) {
        setError("查無符合條件的記錄");
      }
    } catch (err: any) {
      console.error("Error searching scores:", err);
      setError(err.message || "查詢失敗");
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleReset = () => {
    setKeyword("");
    setResults([]);
    setError("");
  };

  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      params.append('userId', userId);
      params.append('userRole', role);
      if (selectedClassId) params.append('classId', selectedClassId);
      if (keyword) params.append('keyword', keyword);
      params.append('format', exportFormat === 'xlsx_paged' ? 'xlsx' : exportFormat);
      if (exportFormat === 'xlsx_paged') params.append('paged', 'true');
      if (includeRatings) params.append('includeRatings', 'true');

      const res = await fetch(`/api/scores/export?${params.toString()}`);
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const ext = exportFormat === 'csv' ? 'csv' : 'xlsx';
      a.download = `scores_export.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('Export error:', err);
      setError(err.message || '匯出失敗');
    }
  };

  if (loading) {
    return (
      <div className="p-4 bg-white dark:bg-gray-800 rounded shadow-md">
        載入中...
      </div>
    );
  }

  // Group results by session for display
  const groupedBySession = results.reduce(
    (acc, result) => {
      const key = result.session_id;
      if (!acc[key]) {
        acc[key] = {
          session: {
            id: result.session_id,
            title: result.session_title,
            class_name: result.class_name,
          },
          students: [],
        };
      }
      acc[key].students.push(result);
      return acc;
    },
    {} as Record<
      string,
      {
        session: {
          id: string;
          title: string;
          class_name: string;
        };
        students: StudentScoreQueryResult[];
      }
    >
  );

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded shadow-md border border-gray-200 dark:border-gray-700 w-full">
      {/* Title */}
      <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100">
        分數查詢
      </h2>

      {/* Query Conditions Section */}
      <div className="bg-gray-50 dark:bg-gray-900 p-6 rounded-lg mb-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200">
          查詢條件
        </h3>

        <form onSubmit={handleSearch} className="space-y-4">
          {/* Class Dropdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                班別
              </label>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                {classes.length === 0 ? (
                  <option>無可用班級</option>
                ) : (
                  classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name}
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Keyword Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                學生 (學號或姓名)
              </label>
              <input
                type="text"
                placeholder="搜尋學號或姓名..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={isSearching}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold disabled:bg-gray-400"
            >
              {isSearching ? "查詢中..." : "查詢"}
            </button>
            <div className="flex items-center gap-2">
              <select value={exportFormat} onChange={(e) => setExportFormat(e.target.value as any)} className="p-2 border rounded dark:bg-gray-700">
                <option value="csv">CSV</option>
                <option value="xlsx">XLSX</option>
                <option value="xlsx_paged">XLSX (分頁匯出)</option>
              </select>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={includeRatings} onChange={(e) => setIncludeRatings(e.target.checked)} />
                包含評分逐筆明細
              </label>
              <button
                type="button"
                onClick={handleExport}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-semibold"
              >
                匯出
              </button>
            </div>
            <button
              type="button"
              onClick={handleReset}
              className="px-6 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 font-semibold dark:bg-gray-600 dark:text-white"
            >
              重置
            </button>
          </div>
        </form>

        {/* Error Message */}
        {error && (
          <div className="mt-4 p-3 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded text-red-700 dark:text-red-200 text-sm">
            {error}
          </div>
        )}
      </div>

      {/* Results Section */}
      <div>
        {results.length === 0 && !error ? (
          <div className="py-12 text-center text-gray-500 dark:text-gray-400">
            <p>請使用上方查詢條件搜尋</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Summary Section - Displayed First */}
            {results.length > 0 && (
              <>
                {/* Stats Cards */}
                <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200">
                    統計摘要
                  </h3>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded">
                      <p className="text-sm text-gray-600 dark:text-gray-400">總舉手次數</p>
                      <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {results.reduce((sum, r) => sum + r.raiseCount, 0)}
                      </p>
                    </div>
                    <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded">
                      <p className="text-sm text-gray-600 dark:text-gray-400">總被點次數</p>
                      <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {results.reduce((sum, r) => sum + r.answerCount, 0)}
                      </p>
                    </div>
                    <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded">
                      <p className="text-sm text-gray-600 dark:text-gray-400">總評點分數</p>
                      <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                        {results.reduce((sum, r) => sum + r.totalScore, 0)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Summary Table (Aggregated by student) */}
                <div className="mt-8">
                  <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200">
                    彙總表（依學生）
                  </h3>
                  <div className="overflow-x-auto bg-white dark:bg-gray-800 p-4 rounded border border-gray-200 dark:border-gray-700">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-100 dark:bg-gray-700">
                          <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">學號</th>
                          <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">姓名</th>
                          <th className="px-4 py-2 text-center text-sm font-semibold text-gray-700 dark:text-gray-300">總舉手次數</th>
                          <th className="px-4 py-2 text-center text-sm font-semibold text-gray-700 dark:text-gray-300">總被點次數</th>
                          <th className="px-4 py-2 text-center text-sm font-semibold text-gray-700 dark:text-gray-300">總評點分數</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.values(results.reduce((acc: any, r) => {
                          if (!acc[r.account_id]) {
                            acc[r.account_id] = { account_id: r.account_id, student_no: r.student_no, name: r.name, raiseCount: 0, answerCount: 0, totalScore: 0 };
                          }
                          acc[r.account_id].raiseCount += r.raiseCount || 0;
                          acc[r.account_id].answerCount += r.answerCount || 0;
                          acc[r.account_id].totalScore += r.totalScore || 0;
                          return acc;
                        }, {})).map((s: any) => (
                          <tr key={s.account_id} className="border-t border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                            <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 font-medium">{s.student_no}</td>
                            <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{s.name}</td>
                            <td className="px-4 py-3 text-sm text-center text-gray-700 dark:text-gray-300">{s.raiseCount}</td>
                            <td className="px-4 py-3 text-sm text-center text-gray-700 dark:text-gray-300">{s.answerCount}</td>
                            <td className="px-4 py-3 text-sm text-center font-bold text-amber-600 dark:text-amber-400">⭐ {s.totalScore}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Divider */}
                <div className="mt-8 pt-6 border-t-2 border-gray-300 dark:border-gray-600">
                  <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200">
                    課堂歷史明細記錄
                  </h3>
                </div>

                {/* Detailed Session Data */}
                <div className="space-y-6">
                  {Object.entries(groupedBySession).map(([sessionId, group]) => (
                    <div key={sessionId} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                      {/* Session Header */}
                      <div className="bg-blue-50 dark:bg-blue-900 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                        <p className="font-semibold text-blue-900 dark:text-blue-100">
                          {group.session.class_name} - {group.session.title}
                        </p>
                      </div>

                      {/* Results Table */}
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="bg-gray-100 dark:bg-gray-700">
                              <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                                班別
                              </th>
                              <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                                學號
                              </th>
                              <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                                姓名
                              </th>
                              <th className="px-4 py-2 text-center text-sm font-semibold text-gray-700 dark:text-gray-300">
                                舉手次數
                              </th>
                              <th className="px-4 py-2 text-center text-sm font-semibold text-gray-700 dark:text-gray-300">
                                被點次數
                              </th>
                              <th className="px-4 py-2 text-center text-sm font-semibold text-gray-700 dark:text-gray-300">
                                評點分數
                              </th>
                              {role === 'admin' && (
                                <th className="px-4 py-2 text-center text-sm font-semibold text-gray-700 dark:text-gray-300">
                                  操作
                                </th>
                              )}
                            </tr>
                          </thead>
                          <tbody>
                            {group.students.map((student, idx) => (
                              <tr
                                key={`${student.account_id}-${idx}`}
                                className="border-t border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                              >
                                <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                                  {student.class_name}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 font-medium">
                                  {student.student_no}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                                  {student.name}
                                </td>
                                <td className="px-4 py-3 text-sm text-center text-gray-700 dark:text-gray-300 bg-blue-50 dark:bg-blue-900/20">
                                  {student.raiseCount}
                                </td>
                                <td className="px-4 py-3 text-sm text-center text-gray-700 dark:text-gray-300 bg-green-50 dark:bg-green-900/20">
                                  {student.answerCount}
                                </td>
                                <td className="px-4 py-3 text-sm text-center font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20">
                                  ⭐ {student.totalScore}
                                </td>
                                {role === 'admin' && (
                                  <td className="px-4 py-3 text-sm text-center">
                                    <button
                                      onClick={() => {
                                        setModalStudent({ account_id: student.account_id, session_id: student.session_id, totalScore: student.totalScore });
                                        setModalOpen(true);
                                      }}
                                      className="px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600"
                                    >調整分數</button>
                                  </td>
                                )}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
      {/* Adjust Modal */}
      <AdjustScoreModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        initialValue={modalStudent?.totalScore || 0}
        onSave={async (adjusted) => {
          if (!modalStudent) return;
          const payload = {
            sessionId: modalStudent.session_id,
            accountId: modalStudent.account_id,
            adjustedPoint: adjusted,
            modifiedBy: userId
          };

          const res = await fetch('/api/scores/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          const data = await res.json();
          if (!data.ok) throw new Error(data.error || 'update failed');

          // update local state
          setResults((prev) => prev.map((r) => r.account_id === modalStudent.account_id && r.session_id === modalStudent.session_id ? { ...r, totalScore: adjusted } : r));
        }}
      />
    </div>
  );
}
