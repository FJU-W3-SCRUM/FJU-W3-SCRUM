import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';

// GET /api/class-mode/sessions
// Fetches all active "class mode" sessions for students to join.
export async function GET() {
  try {
    const { data: sessions, error } = await supabaseAdmin
      .from('sessions')
      .select(`
        id,
        title,
        class_id,
        starts_at,
        classes ( class_name )
      `)
      .eq('status', 'active')
      .is('ends_at', null)
      .order('created_at', { ascending: false });

    if (error) throw error;

    type SessionRecord = {
      id: number;
      title: string;
      starts_at: string | null;
      classes?: { class_name?: string } | null;
    };

    const sessionRows = (sessions || []) as SessionRecord[];
    const formatted = sessionRows.map((s) => ({
      id: s.id,
      title: s.title,
      class_name: s.classes?.class_name || '未知班級',
      starts_at: s.starts_at,
    }));

    return NextResponse.json({ sessions: formatted });

  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error('Error fetching class mode sessions:', errorMessage);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}


// POST /api/class-mode/sessions
// Creates a new "class mode" session for a given class. (Teacher only)
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const { class_id, title } = body;

    if (!class_id || !title) {
      return NextResponse.json({ error: 'class_id and title are required' }, { status: 400 });
    }

    const numericClassId = Number(class_id);
    if (Number.isNaN(numericClassId)) {
      return NextResponse.json({ error: 'class_id format is invalid' }, { status: 400 });
    }

    // End any existing active sessions for this class
    await supabaseAdmin
      .from('sessions')
      .update({ ends_at: new Date().toISOString(), status: 'closed' })
      .eq('class_id', numericClassId)
      .is('ends_at', null);

    const { data: session, error: sessionError } = await supabaseAdmin
      .from('sessions')
      .insert([
        {
          class_id: numericClassId,
          title,
          status: 'active',
          starts_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (sessionError) throw sessionError;

    return NextResponse.json(session);
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error('Unexpected error in POST /api/class-mode/sessions:', errorMessage);
    return NextResponse.json({ error: errorMessage || 'Failed to create session' }, { status: 500 });
  }
}
