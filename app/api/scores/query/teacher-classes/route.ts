import { NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase/client';
import { getTeacherClasses } from '@/lib/services/score-query-service';

/**
 * POST /api/scores/query/teacher-classes
 * 取得老師的班別列表
 * 
 * Body:
 * - teacherId: 老師 ID
 */
export async function POST(request: Request) {
  try {
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
  } catch (error: any) {
    console.error('POST /api/scores/query/teacher-classes error:', error);
    return NextResponse.json(
      { ok: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
