/**
 * Task01 API: Student Scores for Session
 * 
 * GET /api/scores/student-scores?sessionId=xxx[&accountId=xxx]
 * 
 * 獲取課堂內的學生發言統計
 * - 不指定 accountId: 返回課堂內所有學生的統計
 * - 指定 accountId: 返回指定學生的統計
 */

import { NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase/client';
import {
  getStudentScoresForSession,
  getStudentScoreForSession
} from '@/lib/services/student-score-service';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const sessionId = url.searchParams.get('sessionId');
    const accountId = url.searchParams.get('accountId');

    // 驗證必要參數
    if (!sessionId) {
      return NextResponse.json(
        { ok: false, error: 'sessionId is required' },
        { status: 400 }
      );
    }

    // 路由邏輯
    if (accountId) {
      // 獲取單一學生的統計
      const score = await getStudentScoreForSession(supabase, sessionId, accountId);
      return NextResponse.json({ ok: true, data: score }, { status: 200 });
    } else {
      // 獲取課堂所有學生的統計
      const scores = await getStudentScoresForSession(supabase, sessionId);
      return NextResponse.json({ ok: true, data: scores }, { status: 200 });
    }
  } catch (error: any) {
    console.error('GET /api/scores/student-scores error:', error);
    return NextResponse.json(
      { ok: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
