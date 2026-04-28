import { NextResponse } from 'next/server';
import supabase from '@/lib/supabase/client';

// GET /api/class-mode/sessions
// Fetches all active "class mode" sessions for students to join.
export async function GET(request: Request) {
  try {
    const { data, error } = await supabase
      .from('sessions')
      .select('id, title, class_id, classes(class_name)')
      .eq('status', 'active') // 'active' for Class Mode (matches DB)
      .is('ends_at', null) // Active sessions
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    // Format the data to be more frontend-friendly
    const sessions = data.map(s => ({
      id: s.id,
      title: s.title,
      class_name: Array.isArray(s.classes) ? s.classes[0]?.class_name : s.classes?.class_name || '未知班級',
    }));

    return NextResponse.json({ sessions });

  } catch (error: any) {
    console.error('Error fetching class mode sessions:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


// POST /api/class-mode/sessions
// Creates a new "class mode" session for a given class. (Teacher only)
export async function POST(request: Request) {
  const { class_id, title } = await request.json(); // Correctly expect 'title'

  if (!class_id || !title) {
    return NextResponse.json({ error: 'class_id and title are required' }, { status: 400 });
  }

  try {
    // The column for the session's name is 'title', not 'name'.
    // Use 'active' as the status value for class-mode sessions (matches DB values).
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .insert({ class_id, title, status: 'active' })
      .select()
      .single();

    if (sessionError) {
      console.error('Error creating class mode session:', sessionError);
      return NextResponse.json({ error: 'Failed to create session', details: sessionError.message }, { status: 500 });
    }

    return NextResponse.json(session);
    
  } catch (e: any) {
    console.error('Unexpected error in POST /api/class-mode/sessions:', e);
    return NextResponse.json({ error: 'An unexpected error occurred.', details: e.message }, { status: 500 });
  }
}
