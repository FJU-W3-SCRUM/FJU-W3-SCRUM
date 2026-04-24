import { NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase/client';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const session_id = url.searchParams.get('session_id');

    if (!session_id) {
      return NextResponse.json({ error: 'Missing session_id parameter' }, { status: 400 });
    }

    // 1. Fetch Session Info
    const { data: sessionInfo, error: sessionError } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', session_id)
      .single();

    if (sessionError || !sessionInfo) {
      return NextResponse.json({ error: sessionError ? sessionError.message : 'Session not found' }, { status: 404 });
    }

    const class_id = sessionInfo.class_id;
    const session_status = sessionInfo.status;

    // 2. Fetch Class Name
    const { data: classInfo } = await supabase
      .from('classes')
      .select('class_name')
      .eq('id', class_id)
      .single();
    
    const class_name = classInfo?.class_name || "未知班級";

    // 3. Fetch Presenting Group Status
    const { data: sgData } = await supabase
      .from('session_groups')
      .select('group_id, status')
      .eq('session_id', session_id)
      .order('id', { ascending: false })
      .limit(1)
      .maybeSingle();
      
    const presenting_group_id = sgData ? sgData.group_id : null;
    const presenting_status = sgData?.status || 'N';

    // 4. Fetch Available Groups
    const { data: availableGroups } = await supabase
      .from('groups')
      .select('id, group_name')
      .eq('class_id', class_id)
      .order('group_name', { ascending: true });

    const groupIds = availableGroups?.map(g => g.id) || [];

    // 5. Fetch Class Members
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

    // 6. Fetch Group Memberships (using student_no as per actual schema)
    const { data: groupMembers, error: groupsError } = await supabase
      .from('group_members')
      .select(`
        student_no,
        is_leader,
        group_id,
        groups (
          id,
          group_name
        )
      `)
      .in('group_id', groupIds);

    if (groupsError) throw new Error(`groupsError: ${groupsError.message}`);

    // 7. Fetch Pending Hand Raises
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
      .order('raised_at', { ascending: true });

    if (handsError) throw new Error(`handsError: ${handsError.message}`);

    // 8. Process Map
    const memberMap: any = {};
    const memberByStudentNo: any = {};

    classMembers?.forEach((cm: any) => {
      const memberObj = {
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
      memberMap[cm.account_id] = memberObj;
      memberByStudentNo[cm.accounts.student_no] = memberObj;
    });

    groupMembers?.forEach((gm: any) => {
      const targetMember = memberByStudentNo[gm.student_no];
      if (targetMember) {
        const g = Array.isArray(gm.groups) ? gm.groups[0] : gm.groups;
        if (g) {
          targetMember.group = {
            id: gm.group_id,
            name: g.group_name
          };
        }
        targetMember.is_leader = gm.is_leader;
      }
    });

    pendingHands?.forEach((h: any) => {
      if (memberMap[h.account_id]) {
         memberMap[h.account_id].hand_raised = true;
         memberMap[h.account_id].raised_at = h.raised_at;
      }
    });

    return NextResponse.json({
       session_id,
       class_id,
       class_name,
       qna_open: sessionInfo.qna_open,
       session_status,
       presenting_group_id,
       presenting_status,
       available_groups: availableGroups || [],
       members: Object.values(memberMap),
       hands_up_queue: pendingHands
    }, { status: 200 });

  } catch (err: any) {
    console.error("API Error in overview:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
