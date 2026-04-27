import { NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase/client';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { session_id, qna_open, presenting_group_id, report_action, session_action } = body;

    // 1. Toggle Q&A state
    if (qna_open !== undefined) {
       await supabase.from('sessions').update({ qna_open }).eq('id', session_id);
       
       // Task 4.1: If closing Q&A, also clear all current hand raises (R -> P)
       if (qna_open === false) {
           await supabase.from('hand_raises')
                .update({ status: 'P' })
                .eq('session_id', session_id)
                .eq('status', 'R');
       }
    }
    
    // 2. Changing the selected group
    if (presenting_group_id !== undefined && !report_action) {
       const { data: existingGroup } = await supabase.from('session_groups').select('*').eq('session_id', session_id).eq('group_id', presenting_group_id).single();
       if (!existingGroup && presenting_group_id) {
           await supabase.from('session_groups').insert([{ session_id, group_id: presenting_group_id, status: 'N' }]);
       }
    }
    
    // 3. report_action: "start" | "end" (Updates ONLY session_groups timings)
    if (report_action && presenting_group_id) {
       const now = new Date().toISOString();
       if (report_action === 'start') {
           await supabase.from('session_groups')
                .update({ status: 'P', started_at: now })
                .eq('session_id', session_id)
                .eq('group_id', presenting_group_id);
           
           // We still update session status for UI filtering, but NOT the starts_at/ends_at
           await supabase.from('sessions')
                .update({ status: 'P' })
                .eq('id', session_id);
       } else if (report_action === 'end') {
           await supabase.from('session_groups')
                .update({ status: 'Y', ended_at: now })
                .eq('session_id', session_id)
                .eq('group_id', presenting_group_id);

           await supabase.from('sessions')
                .update({ status: 'Y' })
                .eq('id', session_id);
       }
    }

    // 4. session_action: "start_session" | "end_session" (Updates sessions table timings)
    if (session_action) {
        const now = new Date().toISOString();
        if (session_action === 'start_session') {
            // Only update if not already started
            const { data: sess } = await supabase.from('sessions').select('starts_at').eq('id', session_id).single();
            if (sess && !sess.starts_at) {
                await supabase.from('sessions')
                    .update({ starts_at: now, status: 'active' })
                    .eq('id', session_id);
            }
        } else if (session_action === 'end_session') {
            await supabase.from('sessions')
                .update({ ends_at: now, status: 'closed' })
                .eq('id', session_id);
        }
    }

    // 5. max_point: update session max point
    if (body.max_point !== undefined && session_id) {
        const mp = Number(body.max_point) || 0;
        await supabase.from('sessions').update({ max_point: mp }).eq('id', session_id);
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
