/**
 * Task02: Score Query Panel - Redesigned UI
 *
 * 分數查詢功能組件（根據 SP3004 規格）
 * - 老師可查詢所有班別和所有學生成績
 * - 學生只能查詢同班成績
 * - 支持班別、課堂篩選和關鍵字搜尋
 * - 顯示給分人是老師還是組長的信息
 */

"use client";

import React, { useEffect, useState } from "react";
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

interface SessionOption {
  id: string;
  title: string;
  class_name: string;
  created_at: string;
}

export default function ScoreQueryPanel({ user }: ScoreQueryPanelProps) {
  const role = user?.role?.toLowerCase() || "student";
  const userId = user?.id;
  const defaultKeyword =
    role === "student" ? user?.student_no || user?.name || "" : "";

  const [loading, setLoading] = useState(true); // 頁面初始載入
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [sessions, setSessions] = useState<SessionOption[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");
  const [keyword, setKeyword] = useState<string>(defaultKeyword);
  const [results, setResults] = useState<StudentScoreQueryResult[]>([]);
  const [isSearching, setIsSearching] = useState(false); // 查詢中的 loading
  const [error, setError] = useState<string>("");
  const [expandedScoreDetails, setExpandedScoreDetails] = useState<Set<string>>(
    new Set(),
  );
  const [shouldAutoSearch, setShouldAutoSearch] = useState(false); // 標記是否需要自動查詢

  // Load available classes for user
  useEffect(() => {
    loadClasses();
  }, [role, userId]);

  // Load sessions when class is selected
  useEffect(() => {
    if (selectedClassId) {
      loadSessions(selectedClassId);
      // 自動查詢：班級改變後自動執行查詢
      setShouldAutoSearch(true);
    } else {
      setSessions([]);
      setSelectedSessionId("");
    }
  }, [selectedClassId]);

  // Auto search when shouldAutoSearch is triggered
  useEffect(() => {
    if (shouldAutoSearch && selectedClassId && !loading) {
      handleSearchAuto();
      setShouldAutoSearch(false);
    }
  }, [shouldAutoSearch]);

  // Auto search when session is auto-selected
  useEffect(() => {
    if (
      selectedSessionId &&
      selectedClassId &&
      !loading &&
      results.length === 0
    ) {
      handleSearchAuto();
    }
  }, [selectedSessionId]);

  const loadClasses = async () => {
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
          role === "admin" ? { teacherId: userId } : { studentId: userId },
        ),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      if (!data.ok) {
        throw new Error(data.error || "Failed to load classes");
      }

      // 後端已按 ID 降序排列（最新的優先）
      setClasses(data.data || []);

      // Auto-select first class (已排序，第一個是最新的班級)
      if (data.data && data.data.length > 0) {
        setSelectedClassId(data.data[0].id);
      }
    } catch (err: any) {
      console.error("Error loading classes:", err);
      setError(err.message || "無法加載班級列表");
    } finally {
      setLoading(false);
    }
  };

  const loadSessions = async (classId: string) => {
    try {
      const params = new URLSearchParams();
      params.append("classId", classId);

      const response = await fetch(
        `/api/scores/query/sessions?${params.toString()}`,
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      if (!data.ok) {
        throw new Error(data.error || "Failed to load sessions");
      }

      // Sort sessions by created_at in descending order (newest first)
      const sortedSessions = (data.data || []).sort((a: any, b: any) => {
        return (
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      });
      setSessions(sortedSessions);

      // 預設保持 --全部課堂--，不自動選擇課堂
      setSelectedSessionId("");
    } catch (err: any) {
      console.error("Error loading sessions:", err);
      // Don't show error for sessions, just proceed
    }
  };

  // 自動查詢（不需要表單提交）
  const handleSearchAuto = async () => {
    try {
      setIsSearching(true);
      setError("");

      const params = new URLSearchParams();
      params.append("userId", userId);
      params.append("userRole", role);
      if (selectedClassId) {
        params.append("classId", selectedClassId);
      }
      if (selectedSessionId) {
        params.append("sessionId", selectedSessionId);
      }
      if (keyword) {
        params.append("keyword", keyword);
      }

      const response = await fetch(`/api/scores/query?${params.toString()}`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      if (!data.ok) {
        throw new Error(data.error || "Query failed");
      }

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

  // 手動查詢（表單提交）
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleSearchAuto();
  };

  const toggleScoreDetails = (key: string) => {
    const newSet = new Set(expandedScoreDetails);
    if (newSet.has(key)) {
      newSet.delete(key);
    } else {
      newSet.add(key);
    }
    setExpandedScoreDetails(newSet);
  };

  const handleExportExcel = () => {
    const blob = buildExcelWorkbook(results);
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const className =
      classes.find((cls) => cls.id === selectedClassId)?.name ||
      results[0]?.class_name ||
      "未選班別";
    const sessionName =
      selectedSessionId && sessions.find((s) => s.id === selectedSessionId)
        ? sessions.find((s) => s.id === selectedSessionId)!.title
        : "全部課堂";
    link.href = url;
    link.download = `${safeFilename(`分數報表_${className}_${sessionName}`)}.xlsx`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  // 合併 loading 和 isSearching 狀態來決定是否顯示查詢中提示
  const isLoading = loading || isSearching;

  if (loading) {
    return (
      <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600 dark:text-gray-400">
            載入中...
          </span>
        </div>
      </div>
    );
  }

  // Group results by session for display
  // 如果選了特定課堂，按 session_id 分組（逐課堂顯示）
  // 如果未選課堂（聚合模式），所有結果放在一個虛擬課堂中
  const groupedBySession = results.reduce(
    (acc, result) => {
      const key = result.session_id; // 在聚合模式下，session_id 都是 'aggregated'
      if (!acc[key]) {
        acc[key] = {
          session: {
            id: result.session_id,
            title: result.session_title,
            class_name: result.class_name,
            date: result.session_date,
            isAggregated: result.session_id === "aggregated", // 標記是否為聚合模式
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
          date?: string;
          isAggregated?: boolean;
        };
        students: StudentScoreQueryResult[];
      }
    >,
  );

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 w-full">
      {/* Title */}
      <h2 className="text-3xl font-bold mb-8 text-gray-900 dark:text-gray-100">
        📊 分數查詢系統
      </h2>

      {/* Query Conditions Section */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-6 rounded-lg mb-8 border border-blue-200 dark:border-blue-800">
        <h3 className="text-lg font-semibold mb-5 text-gray-800 dark:text-gray-200 flex items-center">
          <span className="mr-2">🔍</span> 查詢條件
        </h3>

        <form onSubmit={handleSearch} className="space-y-5">
          {/* Class and Session Dropdowns */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                班別 <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                disabled={role === "student"}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition disabled:opacity-50 disabled:cursor-not-allowed"
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

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                課堂 (可選)
              </label>
              <select
                value={selectedSessionId}
                onChange={(e) => setSelectedSessionId(e.target.value)}
                disabled={sessions.length === 0}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">--全部課堂--</option>
                {sessions.map((session) => {
                  const timeStr = new Date(session.created_at).toLocaleString(
                    "zh-TW",
                    { hour: "2-digit", minute: "2-digit" },
                  );
                  return (
                    <option key={session.id} value={session.id}>
                      {session.title} ({timeStr})
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {/* Keyword Search */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              學生搜尋 (可選)
            </label>
            <input
              type="text"
              placeholder="輸入學號或姓名..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={isSearching || !selectedClassId}
              className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition shadow-md hover:shadow-lg flex items-center gap-2"
            >
              {isSearching ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>查詢中...</span>
                </>
              ) : (
                "🔍 查詢"
              )}
            </button>
            {role === "admin" && (
              <button
                type="button"
                onClick={handleExportExcel}
                disabled={results.length === 0 || isSearching}
                className="px-6 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition shadow-md hover:shadow-lg"
              >
                下載 Excel
              </button>
            )}
          </div>
        </form>

        {/* Error Message */}
        {error && (
          <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg text-red-700 dark:text-red-200 text-sm flex items-center">
            <span className="mr-2">⚠️</span> {error}
          </div>
        )}
      </div>

      {/* Statistics Summary - Only show if results > 1 */}
      {results.length > 1 &&
        (() => {
          const totalRaises = results.reduce(
            (sum, r) => sum + r.raise_count,
            0,
          );
          const totalAnswers = results.reduce(
            (sum, r) => sum + r.answer_count,
            0,
          );
          const totalScore = results.reduce((sum, r) => sum + r.total_score, 0);
          const studentCount = new Set(results.map((r) => r.account_id)).size;

          const raiseValue = (totalRaises / studentCount).toFixed(2);
          const answerValue = (totalAnswers / studentCount).toFixed(2);
          const scoreValue = (totalScore / studentCount).toFixed(2);

          return (
            <div className="mb-8 pt-6 border-t border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
                📈 統計摘要{" "}
                <span className="text-xs text-gray-500">(平均值)</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    📊 參與學生
                  </p>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {studentCount}
                  </p>
                </div>
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    🙋 平均舉手
                  </p>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {raiseValue}
                  </p>
                </div>
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    ✋ 平均被點
                  </p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {answerValue}
                  </p>
                </div>
                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    ⭐ 平均評分
                  </p>
                  <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                    {scoreValue}
                  </p>
                </div>
              </div>
            </div>
          );
        })()}

      {/* Results Section */}
      <div>
        <h3 className="text-xl font-semibold mb-6 text-gray-800 dark:text-gray-200 flex items-center">
          <span className="mr-2">📋</span> 查詢結果 ({results.length} 筆)
        </h3>

        {/* Searching Loading - Show loading spinner in results area */}
        {isSearching && (
          <div className="py-12 flex flex-col items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600 mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              查詢中...
            </p>
          </div>
        )}

        {!isSearching && (
          <>
            {results.length === 0 && !error ? (
              <div className="py-16 text-center">
                <div className="text-6xl mb-4">📭</div>
                <p className="text-gray-500 dark:text-gray-400 text-lg">
                  請使用上方查詢條件搜尋
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(groupedBySession).map(([sessionId, group]) => (
                  <div
                    key={sessionId}
                    className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden hover:shadow-lg transition"
                  >
                    {/* Session Header */}
                    <div className="bg-gradient-to-r from-blue-500 to-indigo-600 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-bold text-white text-lg">
                            {group.session.isAggregated
                              ? group.session.title
                              : `${group.session.class_name} - ${group.session.title}`}
                          </p>
                          {group.session.date &&
                            !group.session.isAggregated && (
                              <p className="text-blue-100 text-sm mt-1">
                                📅{" "}
                                {new Date(
                                  group.session.date,
                                ).toLocaleDateString("zh-TW", {
                                  year: "numeric",
                                  month: "2-digit",
                                  day: "2-digit",
                                })}
                              </p>
                            )}
                        </div>
                        <div className="bg-white/20 px-3 py-1 rounded-full text-white font-semibold text-sm">
                          {group.students.length} 人
                        </div>
                      </div>
                    </div>

                    {/* Results Table */}
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-gray-100 dark:bg-gray-700">
                            {/* Desktop: Show all columns */}
                            <th className="hidden md:table-cell px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                              學號
                            </th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                              姓名
                            </th>
                            {/* 只在有組別信息時顯示 */}
                            {group.students.some((s) => s.group_name) && (
                              <th className="hidden lg:table-cell px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                                組別
                              </th>
                            )}
                            <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 dark:text-gray-300">
                              舉手
                            </th>
                            <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 dark:text-gray-300">
                              被點
                            </th>
                            <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 dark:text-gray-300">
                              評分
                            </th>
                            <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 dark:text-gray-300">
                              詳情
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {group.students.map((student, idx) => {
                            const detailsKey = `${student.account_id}-${sessionId}`;
                            const isExpanded =
                              expandedScoreDetails.has(detailsKey);

                            return (
                              <React.Fragment
                                key={`${student.account_id}-${idx}`}
                              >
                                <tr className="border-t border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition">
                                  <td className="hidden md:table-cell px-4 py-3 text-sm text-gray-900 dark:text-gray-100 font-medium">
                                    {student.student_no}
                                  </td>
                                  <td className="px-3 py-3 text-sm text-gray-900 dark:text-gray-100 md:px-4">
                                    <div className="flex flex-col items-start gap-1 md:flex-row md:items-center md:gap-0">
                                      <span className="order-2 break-words leading-snug md:order-1">
                                        {student.name}
                                      </span>
                                      {student.group_leader && (
                                        <span className="order-1 px-2 py-0.5 bg-yellow-200 text-yellow-800 text-xs font-bold rounded-full md:order-2 md:ml-2">
                                          👑 組長
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  {group.students.some((s) => s.group_name) && (
                                    <td className="hidden lg:table-cell px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                                      {student.group_name || "—"}
                                    </td>
                                  )}
                                  <td className="px-4 py-3 text-sm text-center text-gray-900 dark:text-gray-100 bg-blue-50 dark:bg-blue-900/20 font-semibold">
                                    {student.raise_count}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-center text-gray-900 dark:text-gray-100 bg-green-50 dark:bg-green-900/20 font-semibold">
                                    {student.answer_count}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-center font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20">
                                    ⭐ {student.total_score}
                                  </td>
                                  <td className="px-2 py-3 text-center md:px-4">
                                    {student.score_details &&
                                      student.score_details.length > 0 && (
                                        <button
                                          onClick={() =>
                                            toggleScoreDetails(detailsKey)
                                          }
                                          aria-label={
                                            isExpanded ? "隱藏詳情" : "顯示詳情"
                                          }
                                          title={
                                            isExpanded ? "隱藏詳情" : "顯示詳情"
                                          }
                                          className="inline-flex h-7 min-w-7 items-center justify-center rounded bg-indigo-100 px-2 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:hover:bg-indigo-900/50 md:h-auto md:min-w-0 md:px-3 md:py-1"
                                        >
                                          <span className="md:hidden">
                                            {isExpanded ? "^" : "V"}
                                          </span>
                                          <span className="hidden whitespace-nowrap md:inline">
                                            {isExpanded ? "▼ 隱藏" : "▶ 顯示"}
                                          </span>
                                        </button>
                                      )}
                                  </td>
                                </tr>

                                {/* Score Details Row */}
                                {isExpanded &&
                                  student.score_details &&
                                  student.score_details.length > 0 && (
                                    <tr className="bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-700">
                                      <td
                                        colSpan={
                                          group.students.some(
                                            (s) => s.group_name,
                                          )
                                            ? 7
                                            : 6
                                        }
                                        className="px-4 py-4"
                                      >
                                        <div className="pl-4">
                                          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                                            💯 評分歷史：
                                          </p>
                                          <div className="space-y-2">
                                            {student.score_details.map(
                                              (detail, detailIdx) => (
                                                <div
                                                  key={detailIdx}
                                                  className="flex items-center justify-between bg-white dark:bg-gray-800 p-3 rounded border border-gray-200 dark:border-gray-700"
                                                >
                                                  <div>
                                                    <div className="flex items-center gap-2 mb-1">
                                                      <span className="font-semibold text-gray-900 dark:text-gray-100">
                                                        {detail.rater_name}
                                                      </span>
                                                      <span
                                                        className={`px-2 py-0.5 text-xs font-bold rounded-full ${
                                                          detail.rater_role ===
                                                          "teacher"
                                                            ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                                                            : detail.rater_role ===
                                                                "group_leader"
                                                              ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                                                            : "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
                                                        }`}
                                                      >
                                                        {detail.rater_label ||
                                                          (detail.rater_role ===
                                                          "teacher"
                                                            ? "🎓 老師"
                                                            : detail.rater_role ===
                                                                "group_leader"
                                                              ? "👑 組長"
                                                              : "👥 給分")}
                                                      </span>
                                                    </div>
                                                    {detail.created_at && (
                                                      <p className="text-xs text-gray-500 dark:text-gray-400">
                                                        📅{" "}
                                                        {new Date(
                                                          detail.created_at,
                                                        ).toLocaleString(
                                                          "zh-TW",
                                                          {
                                                            year: "numeric",
                                                            month: "2-digit",
                                                            day: "2-digit",
                                                            hour: "2-digit",
                                                            minute: "2-digit",
                                                          },
                                                        )}
                                                      </p>
                                                    )}
                                                  </div>
                                                  <span className="text-lg font-bold text-amber-600 dark:text-amber-400">
                                                    ⭐ {detail.star}
                                                  </span>
                                                </div>
                                              ),
                                            )}
                                          </div>
                                        </div>
                                      </td>
                                    </tr>
                                  )}
                              </React.Fragment>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function buildExcelWorkbook(results: StudentScoreQueryResult[]): Blob {
  const listRows = results.map((result) => [
    result.class_name,
    result.session_title,
    result.group_name || "",
    result.group_leader ? "是" : "否",
    result.student_no,
    result.name,
    result.raise_count,
    result.answer_count,
    result.total_score,
  ]);

  const historyRows = results.flatMap((result) =>
    (result.score_details || []).map((detail) => [
      result.class_name,
      detail.session_title || result.session_title,
      result.group_name || "",
      result.student_no,
      result.name,
      detail.rater_name || "",
      detail.rater_label || "",
      detail.star,
      formatExportDate(detail.created_at),
    ]),
  );

  const files: ZipFile[] = [
    {
      path: "[Content_Types].xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>`,
    },
    {
      path: "_rels/.rels",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`,
    },
    {
      path: "xl/workbook.xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="目前列表" sheetId="1" r:id="rId1"/>
    <sheet name="評分歷史" sheetId="2" r:id="rId2"/>
  </sheets>
</workbook>`,
    },
    {
      path: "xl/_rels/workbook.xml.rels",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/>
</Relationships>`,
    },
    {
      path: "xl/worksheets/sheet1.xml",
      content: buildWorksheetXml([
        [
          "班別",
          "課堂",
          "組別",
          "是否組長",
          "學號",
          "姓名",
          "舉手次數",
          "被點次數",
          "總評分",
        ],
        ...listRows,
      ]),
    },
    {
      path: "xl/worksheets/sheet2.xml",
      content: buildWorksheetXml([
        [
          "班別",
          "課堂",
          "組別",
          "學號",
          "姓名",
          "給分者",
          "給分身分",
          "分數",
          "給分時間",
        ],
        ...historyRows,
      ]),
    },
  ];

  const xlsxBytes = buildZip(files);
  const xlsxBuffer = xlsxBytes.buffer.slice(
    xlsxBytes.byteOffset,
    xlsxBytes.byteOffset + xlsxBytes.byteLength,
  ) as ArrayBuffer;

  return new Blob([xlsxBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

function buildWorksheetXml(rows: Array<Array<string | number>>): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>
    ${rows
      .map(
        (row, rowIndex) =>
          `<row r="${rowIndex + 1}">${row
            .map((cell, colIndex) => buildCellXml(cell, rowIndex + 1, colIndex))
            .join("")}</row>`,
      )
      .join("")}
  </sheetData>
</worksheet>`;
}

function buildCellXml(
  value: string | number,
  rowNumber: number,
  colIndex: number,
): string {
  const cellRef = `${columnName(colIndex)}${rowNumber}`;
  if (typeof value === "number") {
    return `<c r="${cellRef}"><v>${value}</v></c>`;
  }

  return `<c r="${cellRef}" t="inlineStr"><is><t>${escapeXml(
    value,
  )}</t></is></c>`;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function safeFilename(value: string): string {
  return value.replace(/[\\/:*?"<>|]/g, "_").replace(/\s+/g, " ").trim();
}

function columnName(index: number): string {
  let name = "";
  let n = index + 1;
  while (n > 0) {
    const remainder = (n - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    n = Math.floor((n - 1) / 26);
  }
  return name;
}

interface ZipFile {
  path: string;
  content: string;
}

function buildZip(files: ZipFile[]): Uint8Array {
  const encoder = new TextEncoder();
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;

  files.forEach((file) => {
    const nameBytes = encoder.encode(file.path);
    const contentBytes = encoder.encode(file.content);
    const crc = crc32(contentBytes);
    const localHeader = createZipHeader(0x04034b50, {
      nameBytes,
      crc,
      size: contentBytes.length,
      offset,
    });

    localParts.push(localHeader, nameBytes, contentBytes);

    const centralHeader = createZipHeader(0x02014b50, {
      nameBytes,
      crc,
      size: contentBytes.length,
      offset,
      central: true,
    });
    centralParts.push(centralHeader, nameBytes);
    offset += localHeader.length + nameBytes.length + contentBytes.length;
  });

  const centralOffset = offset;
  const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
  const endRecord = createEndOfCentralDirectory(
    files.length,
    centralSize,
    centralOffset,
  );

  return concatUint8Arrays([...localParts, ...centralParts, endRecord]);
}

function createZipHeader(
  signature: number,
  options: {
    nameBytes: Uint8Array;
    crc: number;
    size: number;
    offset: number;
    central?: boolean;
  },
): Uint8Array {
  const headerLength = options.central ? 46 : 30;
  const header = new Uint8Array(headerLength);
  const view = new DataView(header.buffer);
  const { dosTime, dosDate } = getDosDateTime();

  view.setUint32(0, signature, true);
  if (options.central) {
    view.setUint16(4, 20, true);
    view.setUint16(6, 20, true);
    view.setUint16(8, 0x0800, true);
    view.setUint16(10, 0, true);
    view.setUint16(12, dosTime, true);
    view.setUint16(14, dosDate, true);
    view.setUint32(16, options.crc, true);
    view.setUint32(20, options.size, true);
    view.setUint32(24, options.size, true);
    view.setUint16(28, options.nameBytes.length, true);
    view.setUint32(42, options.offset, true);
  } else {
    view.setUint16(4, 20, true);
    view.setUint16(6, 0x0800, true);
    view.setUint16(8, 0, true);
    view.setUint16(10, dosTime, true);
    view.setUint16(12, dosDate, true);
    view.setUint32(14, options.crc, true);
    view.setUint32(18, options.size, true);
    view.setUint32(22, options.size, true);
    view.setUint16(26, options.nameBytes.length, true);
  }

  return header;
}

function createEndOfCentralDirectory(
  fileCount: number,
  centralSize: number,
  centralOffset: number,
): Uint8Array {
  const record = new Uint8Array(22);
  const view = new DataView(record.buffer);
  view.setUint32(0, 0x06054b50, true);
  view.setUint16(8, fileCount, true);
  view.setUint16(10, fileCount, true);
  view.setUint32(12, centralSize, true);
  view.setUint32(16, centralOffset, true);
  return record;
}

function getDosDateTime(): { dosTime: number; dosDate: number } {
  const now = new Date();
  const dosTime =
    (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
  const dosDate =
    ((now.getFullYear() - 1980) << 9) |
    ((now.getMonth() + 1) << 5) |
    now.getDate();
  return { dosTime, dosDate };
}

function concatUint8Arrays(parts: Uint8Array[]): Uint8Array {
  const totalLength = parts.reduce((sum, part) => sum + part.length, 0);
  const output = new Uint8Array(totalLength);
  let offset = 0;
  parts.forEach((part) => {
    output.set(part, offset);
    offset += part.length;
  });
  return output;
}

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) {
    crc ^= bytes[i];
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function formatExportDate(value?: string): string {
  if (!value) return "";
  return new Date(value).toLocaleString("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
