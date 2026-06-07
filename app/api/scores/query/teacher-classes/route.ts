import { NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase/client';
import { getTeacherClasses } from '@/lib/services/score-query-service';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const { teacherId } = body;

    const classes = await getTeacherClasses(supabase, teacherId as string | undefined);

    return NextResponse.json({ ok: true, data: classes }, { status: 200 });
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
