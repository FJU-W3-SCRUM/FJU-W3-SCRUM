import { NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase/client';

export async function GET(request: Request) {
  try {
        const url = new URL(request.url);
    const session_id = url.searchParams.get('session_id');

    if (!session_id) {
      return NextResponse.json({ error: 'Missing session_id parameter' }, { status: 400 });
    }

    // Look up the underlying class_id from this session
    const { data: sessionInfo, error: sessionError } = await supabase
      .from('sessions')
      .select('class_id, qna_open, title, status, classes!inner(class_name)')
      .eq('id', session_id)
      .single();

    if (sessionError || !sessionInfo) {
      return NextResponse.json({ error: sessionError ? sessionError.message : 'Session not found' }, { status: 404 });
    }

    const { class_id } = sessionInfo;
    const session_status = sessionInfo.status;

    const { data: sgData } = await supabase
      .from('session_groups')
      .select('group_id, status, started_at, ended_at')
      .eq('session_id', session_id)
      .order('id', { ascending: false })
      .limit(1)
      .maybeSingle();
      
    const presenting_group_id = sgData ? sgData.group_id : null;
    const presenting_status = sgData?.status || 'N';

    const { data: availableGroups } = await supabase
      .from('groups')
      .select('id, group_name')
      .eq('class_id', class_id)
      .order('group_name', { ascending: true });

    // 1. Get class_members corresponding to the given class
    // This will represent total students to populate the overview grid
    const { data: classMembers, error: membersError } = await supabase
      .from('class_members')
      .select(`
        account_id,
        seat_row,
        seat_col,
        accounts!inner (
          id,
          student_no,
          name
        )
      `)
      .eq('class_id', class_id);

    if (membersError) throw new Error(`membersError: ${membersError.message}`);

    // 2. Get group associations
    const { data: groupMembers, error: groupsError } = await supabase
      .from('group_members')
      .select(`
        account_id,
        is_leader,
        group_id,
        groups!inner (
          id,
          group_name,
          class_id
        )
      `)
      .eq('groups.class_id', class_id); // we filter groups bound to this class

    if (groupsError) throw new Error(`groupsError: ${groupsError.message}`);

    // 3. Get pending hand raises for this specific session
    const { data: pendingHands, error: handsError } = await supabase
      .from('hand_raises')
      .select(`
        id,
        account_id,
        raised_at,
        status
      `)
      .eq('session_id', session_id)
      .eq('status', 'pending')
      .order('raised_at', { ascending: true }); // queue order earlier to late

    if (handsError) throw new Error(`handsError: ${handsError.message}`);

    // Compute presentation: join accounts data with groups and active hands-up status
    // A simplified map of `account_id` => data
    const memberMap: any = {};
    classMembers?.forEach((cm: any) => {
      memberMap[cm.account_id] = {
        id: cm.account_id,
        name: cm.accounts.name,
        student_no: cm.accounts.student_no,
        seat_row: cm.seat_row,
        seat_col: cm.seat_col,
        group: null,
        is_leader: false,
        hand_raised: false,
        raised_at: null
      };
    });

    groupMembers?.forEach((gm: any) => {
      if (memberMap[gm.account_id]) {
        memberMap[gm.account_id].group = {
          id: gm.group_id,
          name: gm.groups.group_name
        };
        memberMap[gm.account_id].is_leader = gm.is_leader;
      }
    });

    // Populate hands up data tracking
    pendingHands?.forEach((h: any) => {
      if (memberMap[h.account_id]) {
         memberMap[h.account_id].hand_raised = true;
         memberMap[h.account_id].raised_at = h.raised_at;
      }
    });

    return NextResponse.json({
       session_id,
       class_id,
       class_name: Array.isArray(sessionInfo.classes) ? sessionInfo.classes[0]?.class_name : (sessionInfo.classes as any)?.class_name || "未知班級",
       qna_open: sessionInfo.qna_open,
       session_status,
       presenting_group_id,
       presenting_status,
       available_groups: availableGroups || [],
       members: Object.values(memberMap),
       hands_up_queue: pendingHands
    }, { status: 200 });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}