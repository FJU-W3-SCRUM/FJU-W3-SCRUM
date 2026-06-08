import { NextResponse } from 'next/server';

export async function DELETE(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const { session_id, account_id, actorAccountId, isAdmin } = body;

    if (!session_id || !account_id) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const isSelf = String(actorAccountId) === String(account_id);
    if (!isAdmin && !isSelf) {
      return NextResponse.json({ error: '權限不足' }, { status: 403 });
    }

    const { supabaseAdmin } = await import('../../../../lib/supabase/client');

    const { error } = await supabaseAdmin
      .from('session_seats')
      .delete()
      .eq('session_id', session_id)
      .eq('account_id', account_id);

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    console.error('cancel-seat error', err);
    const e = err as { message?: string; status?: number };
    return NextResponse.json({ error: e.message || 'Server error' }, { status: e.status || 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
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

    // Prevent changing to a different seat once the student already has a confirmed seat.
    const { data: existingSeat, error: existingSeatError } = await supabaseAdmin
      .from('session_seats')
      .select('seat_row,seat_col')
      .eq('session_id', session_id)
      .eq('account_id', actorAccountId)
      .maybeSingle();

    if (existingSeatError) {
      throw existingSeatError;
    }

    if (existingSeat && (existingSeat.seat_row !== row || existingSeat.seat_col !== col)) {
      return NextResponse.json({ error: '你已確認一個座位，若要變更請先聯絡老師或管理者' }, { status: 403 });
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
  } catch (err: unknown) {
    console.error('select-seat error', err);
    const status = err?.status || 500;
    return NextResponse.json({ error: err?.message || 'Server error' }, { status });
  }
}
