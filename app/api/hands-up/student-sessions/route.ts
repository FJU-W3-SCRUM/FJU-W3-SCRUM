import { NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase/client';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const student_no = url.searchParams.get('student_no');

    if (!student_no) {
      return NextResponse.json({ error: 'Missing student_no parameter' }, { status: 400 });
    }

    // 1. Find the classes the student belongs to
    const { data: accounts, error: accountError } = await supabase
      .from('accounts')
      .select('class_id')
      .eq('student_no', student_no);

    if (accountError) throw accountError;
    
    const accountRows = (accounts || []) as Array<{ class_id: number | null }>;
    const classIds = accountRows.map((a) => a.class_id).filter((id): id is number => Boolean(id));

    if (classIds.length === 0) {
      return NextResponse.json({ sessions: [] });
    }

    // 2. Find active sessions for these classes
    // Criteria: sessions.starts_at IS NOT NULL AND sessions.ends_at IS NULL
    const { data: sessions, error: sessionError } = await supabase
      .from('sessions')
      .select(`
        id,
        title,
        status,
        starts_at,
        class_id,
        classes (
          class_name
        )
      `)
      .in('class_id', classIds)
      .not('starts_at', 'is', null)
      .is('ends_at', null)
      .order('created_at', { ascending: false });

    if (sessionError) throw sessionError;

    type SessionRecord = {
      id: number;
      title: string;
      status: string;
      starts_at: string | null;
      class_id: number;
      classes?: { class_name?: string } | null;
    };

    const sessionRows = (sessions || []) as SessionRecord[];
    const latestSessionsMap: Record<number, SessionRecord> = {};
    sessionRows.forEach((s) => {
      const classId = s.class_id;
      if (!latestSessionsMap[classId] || s.id > latestSessionsMap[classId].id) {
        latestSessionsMap[classId] = s;
      }
    });

    const formattedSessions = Object.values(latestSessionsMap).map((s) => ({
      id: s.id,
      title: s.title,
      class_name: s.classes?.class_name || '未知班級',
      status: s.status,
      starts_at: s.starts_at,
    }));

    return NextResponse.json({ sessions: formattedSessions });

  } catch (err: unknown) {
    console.error("API Error in student-sessions:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
