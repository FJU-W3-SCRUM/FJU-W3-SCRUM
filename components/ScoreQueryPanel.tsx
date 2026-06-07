/**
 * Task02: Score Query Panel
 * 
 * 分數查詢功能組件
 * - 老師可查詢所有班別的所有學生成績
 * - 學生只能查詢同班成績
 * - 支持班別篩選和關鍵字搜尋
 */

"use client";

import React, { useCallback, useEffect, useState } from "react";
import type { StudentScoreQueryResult } from "@/lib/services/score-query-service";

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

  const loadClasses = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const endpoint =
        role === "admin"
          ? "/api/scores/query/teacher-classes"
          : "/api/scores/query/student-classes";

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          role === "admin" ? { teacherId: userId } : { studentId: userId }
        ),
      });

      const data = await response.json();

      if (!data.ok) {
        throw new Error(data.error || "Failed to load classes");
      }

      setClasses(data.data || []);

      // Auto-select first class
      if (data.data && data.data.length > 0) {
        setSelectedClassId(data.data[0].id);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("Error loading classes:", err);
      setError(message || "無法加載班級列表");
    } finally {
      setLoading(false);
    }
  }, [role, userId]);

  useEffect(() => {
    const init = async () => {
      await loadClasses();
    };

    void init();
  }, [loadClasses]);

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

      const response = await fetch(`/api/scores/query?${params.toString()}`);
      const data = await response.json();

      if (!data.ok) {
        throw new Error(data.error || "Query failed");
      }

      setResults(data.data || []);

      if (data.data && data.data.length === 0) {
        setError("查無符合條件的記錄");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("Error searching scores:", err);
      setError(message || "查詢失敗");
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
            starts_at: result.session_starts_at,
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
          starts_at: string | null;
        };
        students: StudentScoreQueryResult[];
      }
    >
  );

  // Assign sequential index to sessions sharing the same date+class
  const dateClassCount: Record<string, number> = {};
  const sessionDateIndex: Record<string, number> = {};
  Object.entries(groupedBySession).forEach(([sid, g]) => {
    const dateStr = g.session.starts_at
      ? new Date(g.session.starts_at).toLocaleDateString('zh-TW')
      : g.session.title;
    const key = `${g.session.class_name}::${dateStr}`;
    dateClassCount[key] = (dateClassCount[key] ?? 0) + 1;
    sessionDateIndex[sid] = dateClassCount[key];
  });
  const duplicateDateKeys = new Set(
    Object.entries(dateClassCount).filter(([, c]) => c > 1).map(([k]) => k)
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
        <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200">
          查詢結果 ({results.length} 筆)
        </h3>

        {results.length === 0 && !error ? (
          <div className="py-12 text-center text-gray-500 dark:text-gray-400">
            <p>請使用上方查詢條件搜尋</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedBySession).map(([sessionId, group]) => {
              const dateStr = group.session.starts_at
                ? new Date(group.session.starts_at).toLocaleDateString('zh-TW')
                : null;
              const dateKey = `${group.session.class_name}::${dateStr ?? group.session.title}`;
              const isDuplicate = duplicateDateKeys.has(dateKey);
              const sessionIdx = sessionDateIndex[sessionId];
              const sessionIdxStr = String(sessionIdx).padStart(2, '0');
              const sessionLabel = isDuplicate
                ? `${group.session.title}-${sessionIdxStr}`
                : group.session.title;

              return (
              <div key={sessionId} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                {/* Session Header */}
                <div className="bg-blue-50 dark:bg-blue-900 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                  <p className="font-semibold text-blue-900 dark:text-blue-100">
                    {group.session.class_name} - {sessionLabel}
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
                      </tr>
                    </thead>
                    <tbody>
                      {group.students.map((student, idx) => (
                        <React.Fragment key={`${student.account_id}-${idx}`}>
                          <tr className="border-t border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
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
                          </tr>
                          {student.ratingDetails && student.ratingDetails.length > 0 && (
                            <tr className="border-t border-amber-100 dark:border-amber-900/30 bg-amber-50/40 dark:bg-amber-900/10">
                              <td colSpan={6} className="px-6 py-2">
                                <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                                  <span className="font-medium text-amber-700 dark:text-amber-400">
                                    評分明細
                                    {dateStr && <span className="ml-1 text-gray-400 font-normal">({dateStr}{isDuplicate ? `-${sessionIdxStr}` : ''})</span>}：
                                  </span>
                                  {student.ratingDetails.map((stars, i) => (
                                    <span
                                      key={i}
                                      className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 rounded font-medium"
                                    >
                                      第 {i + 1} 次：{'⭐'.repeat(stars)} {stars} 星
                                    </span>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Stats Footer */}
      {results.length > 0 && (
        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
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
      )}
    </div>
  );
}
