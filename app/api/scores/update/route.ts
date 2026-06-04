import { NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase/client';

/**
 * POST /api/scores/update
 * body: { sessionId, accountId, adjustedPoint, modifiedBy }
 * Requires teacher/admin privileges (caller should enforce).
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sessionId, accountId, adjustedPoint, modifiedBy } = body;

    if (!sessionId || !accountId || adjustedPoint === undefined || !modifiedBy) {
      return NextResponse.json({ ok: false, error: 'sessionId, accountId, adjustedPoint, modifiedBy are required' }, { status: 400 });
    }

    // Upsert into session_scores
    const { data, error } = await supabase
      .from('session_scores')
      .upsert(
        {
          session_id: sessionId,
          account_id: accountId,
          adjusted_point: adjustedPoint,
          adjusted_by: modifiedBy,
          last_updated_by: modifiedBy,
          last_updated_at: new Date().toISOString()
        },
        { onConflict: 'session_id,account_id' }
      )
      .select();

    if (error) {
      console.error('Failed to upsert session_scores:', error);
      throw error;
    }

    // Insert operation log
    await supabase.from('operation_logs').insert({
      account_id: modifiedBy,
      action_type: 'adjust_session_score',
      resource_type: 'session_scores',
      resource_id: Array.isArray(data) && data[0] ? data[0].id : null,
      payload: { sessionId, accountId, adjustedPoint },
      created_at: new Date().toISOString()
    });

    return NextResponse.json({ ok: true, data: data }, { status: 200 });
  } catch (error: any) {
    console.error('POST /api/scores/update error:', error);
    return NextResponse.json({ ok: false, error: error.message || 'Internal server error' }, { status: 500 });
  }
}
