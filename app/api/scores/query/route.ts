/**
 * Task02 API: Score Query
 * 
 * GET /api/scores/query?classId=xxx&keyword=xxx
 * POST /api/scores/query/teacher-classes
 * POST /api/scores/query/student-classes
 * 
 * 支援分數查詢功能
 * - 老師可查詢所有人成績
 * - 學生只能查詢同班成績
 */

import { NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase/client';
import {
  queryScores,
  getTeacherClasses,
  getStudentClasses,
  type ScoreQueryFilters
} from '@/lib/services/score-query-service';

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
 * - keyword: 關鍵字 (學號或姓名)
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);

    // 獲取使用者身份
    const userId =
      url.searchParams.get('userId') ||
      request.headers.get('x-user-id');
    const userRole = (url.searchParams.get('userRole') ||
      request.headers.get('x-user-role') ||
      'student') as 'admin' | 'student';

    if (!userId) {
      return NextResponse.json(
        { ok: false, error: 'userId is required' },
        { status: 400 }
      );
    }

    // 獲取篩選條件
    const filters: ScoreQueryFilters = {};
    const classId = url.searchParams.get('classId');
    const keyword = url.searchParams.get('keyword');

    if (classId) filters.classId = classId;
    if (keyword) filters.keyword = keyword;

    // 執行查詢
    const results = await queryScores(supabase, userId, userRole, filters);

    return NextResponse.json(
      { ok: true, data: results, count: results.length },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('GET /api/scores/query error:', error);
    return NextResponse.json(
      { ok: false, error: error.message || 'Internal server error' },
      { status: error.message?.includes('Access denied') ? 403 : 500 }
    );
  }
}

/**
 * POST /api/scores/query/teacher-classes
 * 取得老師的班別列表
 * 
 * Body:
 * - teacherId: 老師 ID
 */
export async function POST(request: Request) {
  try {
    const pathname = new URL(request.url).pathname;

    if (pathname.includes('/teacher-classes')) {
      const body = await request.json();
      const { teacherId } = body;

      if (!teacherId) {
        return NextResponse.json(
          { ok: false, error: 'teacherId is required' },
          { status: 400 }
        );
      }

      const classes = await getTeacherClasses(supabase, teacherId);

      return NextResponse.json(
        { ok: true, data: classes },
        { status: 200 }
      );
    } else if (pathname.includes('/student-classes')) {
      const body = await request.json();
      const { studentId } = body;

      if (!studentId) {
        return NextResponse.json(
          { ok: false, error: 'studentId is required' },
          { status: 400 }
        );
      }

      const classes = await getStudentClasses(supabase, studentId);

      return NextResponse.json(
        { ok: true, data: classes },
        { status: 200 }
      );
    } else {
      return NextResponse.json(
        { ok: false, error: 'Invalid endpoint' },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error('POST /api/scores/query error:', error);
    return NextResponse.json(
      { ok: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
