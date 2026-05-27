/**
 * Task02 API: Score Query
 *
 * GET /api/scores/query?classId=xxx&sessionId=xxx&keyword=xxx
 *
 * 支援分數查詢功能（根據 SP3004 規格）
 * - 老師可查詢所有班別的所有學生成績
 * - 學生只能查詢同班成績
 * - 支持班別和課堂篩選
 *
 * 其他子路由：
 * - GET /api/scores/query/sessions?classId=xxx - 獲取課堂列表
 * - POST /api/scores/query/teacher-classes - 獲取老師的班別列表
 * - POST /api/scores/query/student-classes - 獲取學生的班別列表
 */

import { NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase/client";
import {
  queryScores,
  type ScoreQueryFilters,
} from "@/lib/services/score-query-service";

/**
 * GET /api/scores/query
 * 查詢成績
 *
 * 必要參數:
 * - userId: 查詢者的使用者 ID (Header: x-user-id 或 query)
 * - userRole: 使用者角色 'admin' 或 'student' (Header: x-user-role 或 query)
 *
 * 可選參數:
 * - classId: 班別 ID
 * - sessionId: 課堂 ID
 * - keyword: 關鍵字 (學號或姓名)
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);

    // 獲取使用者身份
    const userId =
      url.searchParams.get("userId") || request.headers.get("x-user-id");
    const userRole = (url.searchParams.get("userRole") ||
      request.headers.get("x-user-role") ||
      "student") as "admin" | "student";

    if (!userId) {
      return NextResponse.json(
        { ok: false, error: "userId is required" },
        { status: 400 },
      );
    }

    // 獲取篩選條件
    const filters: ScoreQueryFilters = {};
    const classId = url.searchParams.get("classId");
    const sessionId = url.searchParams.get("sessionId");
    const keyword = url.searchParams.get("keyword");

    if (classId) filters.classId = classId;
    if (sessionId) filters.sessionId = sessionId;
    if (keyword) filters.keyword = keyword;

    // 執行查詢
    const results = await queryScores(supabase, userId, userRole, filters);

    return NextResponse.json(
      { ok: true, data: results, count: results.length },
      { status: 200 },
    );
  } catch (error: any) {
    console.error("GET /api/scores/query error:", error);
    return NextResponse.json(
      { ok: false, error: error.message || "Internal server error" },
      { status: error.message?.includes("Access denied") ? 403 : 500 },
    );
  }
}
