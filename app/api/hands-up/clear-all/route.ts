import { NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase/client';

export async function POST(request: Request) {
  try {
        
    // In a real app we'd verify the JWT user role first:
    // const { data: { user } } = await supabase.auth.getUser();
    // Verify user is teacher or session group leader
    
    const { session_id } = await request.json();

    if (!session_id) {
      return NextResponse.json({ error: 'Missing session_id' }, { status: 400 });
    }

    // Clear all currently raised hands (R) for this specific session -> set to Put down (P)
    const { data, error } = await supabase
      .from('hand_raises')
      .update({ status: 'P' })
      .eq('session_id', session_id)
      .eq('status', 'R')
      .select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'All pending hand raises cleared for the session', clearedCount: data?.length || 0 }, { status: 200 });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}