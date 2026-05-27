import { NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase/client';
import { getStudentHistory } from '@/lib/services/student-history-service';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const accountId = url.searchParams.get('accountId');

    if (!accountId) {
      return NextResponse.json({ ok: false, error: 'accountId is required' }, { status: 400 });
    }

    const data = await getStudentHistory(supabase, accountId);

    return NextResponse.json({ ok: true, data }, { status: 200 });
  } catch (error: any) {
    console.error('GET /api/students/history error:', error);
    return NextResponse.json({ ok: false, error: error.message || 'Internal server error' }, { status: 500 });
  }
}
