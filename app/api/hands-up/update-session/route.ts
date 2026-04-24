import { NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase/client';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { session_id, qna_open, presenting_group_id, report_action } = body;

    // Toggle Q&A state
    if (qna_open !== undefined) {
       await supabase.from('sessions').update({ qna_open }).eq('id', session_id);
    }
    
    // Changing the selected group
    if (presenting_group_id !== undefined && !report_action) {
       // Delete any previous selection so there's only one row per group for a clean start (or keep historical ones, but for simplicity here we keep one active per session at a time if the user replaces it before starting)
       const { data: existingGroup } = await supabase.from('session_groups').select('*').eq('session_id', session_id).eq('group_id', presenting_group_id).single();
       if (!existingGroup && presenting_group_id) {
           await supabase.from('session_groups').insert([{ session_id, group_id: presenting_group_id, status: 'N' }]);
       }
    }
    
    // report_action: "start" | "end"
    if (report_action && presenting_group_id) {
       const now = new Date().toISOString();
       if (report_action === 'start') {
           await supabase.from('session_groups')
                .update({ status: 'P', started_at: now })
                .eq('session_id', session_id)
                .eq('group_id', presenting_group_id);
           
           await supabase.from('sessions')
                .update({ status: 'P', starts_at: now })
                .eq('id', session_id);
       } else if (report_action === 'end') {
           await supabase.from('session_groups')
                .update({ status: 'Y', ended_at: now })
                .eq('session_id', session_id)
                .eq('group_id', presenting_group_id);

           await supabase.from('sessions')
                .update({ status: 'Y', ends_at: now })
                .eq('id', session_id);
       }
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
