import { NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase/client';
import { getStudentClasses } from '@/lib/services/score-query-service';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const { studentId } = body;

    if (!studentId) {
      return NextResponse.json({ ok: false, error: 'studentId is required' }, { status: 400 });
    }

    const classes = await getStudentClasses(supabase, studentId as string);

    return NextResponse.json({ ok: true, data: classes }, { status: 200 });
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
