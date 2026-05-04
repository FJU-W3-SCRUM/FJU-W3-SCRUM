import supabase from '@/lib/supabase/client';

export interface ClassModeSessionSummary {
  id: string;
  title: string;
  class_name: string;
}

export interface ClassModeSeatMapEntry {
  seat_x: number;
  seat_y: number;
  student_id: string | null;
  student_name: string;
  user_id: string;
}

const CLASS_MODE_HEARTBEAT_TIMEOUT_MS = 45_000;

export async function getActiveClassModeSessions(): Promise<ClassModeSessionSummary[]> {
  const { data, error } = await supabase
    .from('sessions')
    .select('id, title, class_id, classes(class_name)')
    .eq('status', 'active')
    .is('ends_at', null)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return (data || []).map((s) => {
    const classInfo = Array.isArray(s.classes)
      ? s.classes[0]
      : (s.classes as { class_name?: string } | null);

    return {
      id: s.id,
      title: s.title,
      class_name: classInfo?.class_name || '未知班級',
    };
  });
}

export async function createClassModeSession(class_id: string | number, title: string) {
  const numericClassId = Number(class_id);

  if (Number.isNaN(numericClassId)) {
    throw new Error('class_id format is invalid');
  }

  const { data: session, error: sessionError } = await supabase
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

  if (sessionError) {
    throw sessionError;
  }

  return session;
}

export async function recordClassModeHeartbeat(session_id: string | number) {
  const numericSessionId = Number(session_id);

  if (Number.isNaN(numericSessionId)) {
    throw new Error('session_id format is invalid');
  }

  const { error } = await supabase.from('operation_logs').insert([
    {
      action_type: 'class_mode_heartbeat',
      resource_type: 'session',
      resource_id: numericSessionId,
      payload: { session_id: numericSessionId },
      created_at: new Date().toISOString(),
    },
  ]);

  if (error) {
    throw error;
  }
}

async function getLatestClassModeHeartbeatAt(sessionId: string | number) {
  const numericSessionId = Number(sessionId);

  if (Number.isNaN(numericSessionId)) {
    return null;
  }

  const { data, error } = await supabase
    .from('operation_logs')
    .select('created_at')
    .eq('action_type', 'class_mode_heartbeat')
    .eq('resource_type', 'session')
    .eq('resource_id', numericSessionId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data?.created_at ? new Date(data.created_at) : null;
}

export async function closeStaleClassModeSessions() {
  const { data: activeSessions, error } = await supabase
    .from('sessions')
    .select('id, starts_at')
    .eq('status', 'active')
    .is('ends_at', null);

  if (error) {
    throw error;
  }

  const now = Date.now();

  for (const session of activeSessions || []) {
    const latestHeartbeatAt = await getLatestClassModeHeartbeatAt(session.id);
    const referenceTime = latestHeartbeatAt ?? (session.starts_at ? new Date(session.starts_at) : null);

    if (!referenceTime) {
      continue;
    }

    if (now - referenceTime.getTime() <= CLASS_MODE_HEARTBEAT_TIMEOUT_MS) {
      continue;
    }

    await supabase
      .from('sessions')
      .update({ ends_at: new Date().toISOString(), status: 'closed' })
      .eq('id', session.id)
      .eq('status', 'active');

    await supabase
      .from('session_seats')
      .delete()
      .eq('session_id', session.id);
  }
}

export async function getClassModeSeatMap(session_id: string): Promise<ClassModeSeatMapEntry[]> {
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

  return (data || []).map((seat) => {
    const account = Array.isArray(seat.accounts) ? seat.accounts[0] : seat.accounts;
    return {
      seat_x: seat.seat_col,
      seat_y: seat.seat_row,
      student_id: account?.student_no || null,
      student_name: account?.name || '未知',
      user_id: seat.account_id,
    };
  });
}

export async function selectClassModeSeat(input: {
  session_id: string;
  row: number;
  col: number;
  actorAccountId: string;
}) {
  const { session_id, row, col, actorAccountId } = input;

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
    const conflictError = new Error('此座位已被選擇，請選擇其他座位。');
    (conflictError as Error & { status?: number }).status = 409;
    throw conflictError;
  }

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
}
