import { NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase/client';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const params = url.searchParams;
    const sessionId = params.get('sessionId');
    const modifiedBy = params.get('modifiedBy');

    let q = supabase.from('operation_logs').select('id, account_id, action_type, resource_type, resource_id, payload, created_at').order('created_at', { ascending: false });

    if (sessionId) q = q.eq('resource_id', sessionId);
    if (modifiedBy) q = q.eq('account_id', modifiedBy);

    const { data, error } = await q;
    if (error) throw error;

    return NextResponse.json({ ok: true, data }, { status: 200 });
  } catch (error: any) {
    console.error('GET /api/operation-logs error:', error);
    return NextResponse.json({ ok: false, error: error.message || 'Internal server error' }, { status: 500 });
  }
}
