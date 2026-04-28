import { NextResponse } from 'next/server';
import supabase from '@/lib/supabase/client';

// GET /api/class-mode/seats?session_id=<session_id>
// Fetches the current seat map for a given session.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const session_id = searchParams.get('session_id');

  if (!session_id) {
    return NextResponse.json({ error: 'session_id is required' }, { status: 400 });
  }

  try {
    const { data, error } = await supabase
      .from('session_seats')
      .select(`
        seat_row,
        seat_col,
        account_id,
        accounts (
          student_no,
          name
        )
      `)
      .eq('session_id', session_id);

    if (error) {
      throw error;
    }

    // Format the data to be more frontend-friendly
    // Note: In renderGrid, x = column (0-7), y = row (0-6)
    // In DB: seat_col = column, seat_row = row
    // So: seat_x should be seat_col, seat_y should be seat_row
    const seatMap = data.map(seat => ({
      seat_x: seat.seat_col,
      seat_y: seat.seat_row,
      student_id: seat.accounts?.student_no || null,
      student_name: seat.accounts?.name || '未知',
      user_id: seat.account_id, // The raw account_id from session_seats
    }));

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

    // 2. Check whether another student already occupies this seat.
    const { data: takenSeat, error: takenSeatError } = await supabase
      .from('session_seats')
      .select('account_id')
      .eq('session_id', session_id)
      .eq('seat_row', row)
      .eq('seat_col', col)
      .maybeSingle();

    if (takenSeatError) {
      throw takenSeatError;
    }

    if (takenSeat && takenSeat.account_id !== actorAccountId) {
      return NextResponse.json({ error: '此座位已被選擇，請選擇其他座位。' }, { status: 409 });
    }

    // 3. Upsert the seat selection for this student.
    const { error: upsertError } = await supabase
      .from('session_seats')
      .upsert(
        {
          session_id,
          account_id: actorAccountId,
          seat_row: row,
          seat_col: col,
        },
        { onConflict: 'session_id,account_id' }
      );

    if (upsertError) {
      throw upsertError;
    }

    return NextResponse.json({ success: true, message: '座位選擇成功！' });

  } catch (error: any) {
    console.error('Error upserting seat:', error);
    return NextResponse.json({ error: `伺服器錯誤: ${error.message}` }, { status: 500 });
  }
}
