import { NextResponse } from 'next/server';
import { getClassModeSeatMap, selectClassModeSeat } from '@/lib/class-mode/server';

// GET /api/class-mode/seats?session_id=<session_id>
// Fetches the current seat map for a given session.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const session_id = searchParams.get('session_id');

  if (!session_id) {
    return NextResponse.json({ error: 'session_id is required' }, { status: 400 });
  }

  try {
    const seatMap = await getClassModeSeatMap(session_id);

    return NextResponse.json({ seatMap });

  } catch (error: any) {
    console.error('Error fetching seat map:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


// POST /api/class-mode/seats
// Allows a student to claim or change their seat.
export async function POST(request: Request) {
  try {
    // 1. Get request body
    const { session_id, seat_x, seat_y, seat_row, seat_col, account_id, student_id } = await request.json();
    const row = seat_row ?? seat_x;
    const col = seat_col ?? seat_y;
    const actorAccountId = account_id ?? student_id;

    if (!session_id || row === undefined || col === undefined || !actorAccountId) {
      return NextResponse.json({ error: 'session_id, seat_row, seat_col, and account_id are required' }, { status: 400 });
    }

    // TODO: Add validation to ensure the user making the request is the one specified by `student_id`.
    // This was previously (and incorrectly) handled by supabase.auth.getUser().
    // The frontend should send the logged-in user's ID, and the backend should ideally verify it.

    await selectClassModeSeat({
      session_id,
      row,
      col,
      actorAccountId,
    });

    return NextResponse.json({ success: true, message: '座位選擇成功！' });

  } catch (error: any) {
    if (error?.status === 409) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    console.error('Error upserting seat:', error);
    return NextResponse.json({ error: `伺服器錯誤: ${error.message}` }, { status: 500 });
  }
}
