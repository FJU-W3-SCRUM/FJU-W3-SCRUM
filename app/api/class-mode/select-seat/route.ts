import { NextResponse } from 'next/server';
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { session_id, row, col, actorAccountId } = body;

    if (!session_id || typeof row !== 'number' || typeof col !== 'number' || !actorAccountId) {
      return NextResponse.json({ error: 'Missing or invalid parameters' }, { status: 400 });
    }
    // Implement seat selection here to avoid import resolution issues
    const { supabaseAdmin } = await import('../../../../lib/supabase/client');

    // 1. Check existing taken seat
    const { data: takenSeat, error: takenSeatError } = await supabaseAdmin
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

    const { error: upsertError } = await supabaseAdmin
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

    if (upsertError) throw upsertError;

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('select-seat error', err);
    const status = err?.status || 500;
    return NextResponse.json({ error: err?.message || 'Server error' }, { status });
  }
}
