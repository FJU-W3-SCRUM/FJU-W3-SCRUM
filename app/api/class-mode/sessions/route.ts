import { NextResponse } from 'next/server';
import { closeStaleClassModeSessions, createClassModeSession, getActiveClassModeSessions } from '@/lib/class-mode/server';

// GET /api/class-mode/sessions
// Fetches all active "class mode" sessions for students to join.
export async function GET(request: Request) {
  try {
    await closeStaleClassModeSessions();
    const sessions = await getActiveClassModeSessions();

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
    const session = await createClassModeSession(class_id, title);

    return NextResponse.json(session);
    
  } catch (e: any) {
    console.error('Unexpected error in POST /api/class-mode/sessions:', e);
    return NextResponse.json({ error: e?.message || 'Failed to create session' }, { status: 500 });
  }
}
