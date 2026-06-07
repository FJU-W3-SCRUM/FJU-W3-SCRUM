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

    const availableGroupsList = (availableGroups || []) as Array<{ id: number; group_name: string }>;
    const groupIds = availableGroupsList.map((g) => g.id);

    // 5. Fetch Class Members from accounts table (more reliable than class_members)
    const { data: accounts, error: accountsError } = await supabase
      .from('accounts')
      .select('id, student_no, name')
      .eq('class_id', class_id)
      .eq('role', 'student');

    if (accountsError) throw new Error(`accountsError: ${accountsError.message}`);

    const accountRows = (accounts || []) as Array<{ id: number; student_no: string; name: string }>;

    // Fetch seating info if available
    const { data: seatData } = await supabase
      .from('class_members')
      .select('account_id, seat_row, seat_col')
      .eq('class_id', class_id);

    const seatRows = (seatData || []) as Array<{ account_id: number; seat_row: number; seat_col: number }>;
    const seatMap: Record<number, { row: number; col: number }> = {};
    seatRows.forEach((s) => {
      seatMap[s.account_id] = { row: s.seat_row, col: s.seat_col };
    });

    // 6. Fetch Group Memberships
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
      .eq('status', 'R')
      .order('raised_at', { ascending: true });

    if (handsError) throw new Error(`handsError: ${handsError.message}`);

    // 8. Process Map
    // 7b. Fetch session-specific seat selections (session_seats)
    const { data: sessionSeats } = await supabase
      .from('session_seats')
      .select('account_id, seat_row, seat_col')
      .eq('session_id', session_id);

    type MemberInfo = {
      id: number;
      name: string;
      student_no: string;
      seat_row: number | null;
      seat_col: number | null;
      group: { id: number; name: string } | null;
      is_leader: boolean;
      hand_raised: boolean;
      hand_raise_id: number | null;
      raised_at: string | null;
    };

    const memberMap: Record<number, MemberInfo> = {};
    const memberByStudentNo: Record<string, MemberInfo> = {};

    accountRows.forEach((acc) => {
      const seat = seatMap[acc.id];
      const memberObj: MemberInfo = {
        id: acc.id,
        name: acc.name,
        student_no: acc.student_no,
        seat_row: seat?.row ?? null,
        seat_col: seat?.col ?? null,
        group: null,
        is_leader: false,
        hand_raised: false,
        hand_raise_id: null,
        raised_at: null,
      };
      memberMap[acc.id] = memberObj;
      memberByStudentNo[acc.student_no] = memberObj;
    });

    const groupMemberRows = (groupMembers || []) as Array<{
      student_no: string;
      is_leader: boolean;
      group_id: number;
      groups: Array<{ id: number; group_name: string }> | { id: number; group_name: string } | null;
    }>;

    groupMemberRows.forEach((gm) => {
      const targetMember = memberByStudentNo[gm.student_no];
      if (targetMember) {
        const g = Array.isArray(gm.groups) ? gm.groups[0] : gm.groups;
        if (g) {
          targetMember.group = {
            id: gm.group_id,
            name: g.group_name,
          };
        }
        targetMember.is_leader = gm.is_leader;
      }
    });

    const pendingHandRows = (pendingHands || []) as Array<{
      id: number;
      account_id: number;
      raised_at: string;
      status: string;
    }>;

    pendingHandRows.forEach((h) => {
      const member = memberMap[h.account_id];
      if (member) {
        member.hand_raised = true;
        member.hand_raise_id = h.id;
        member.raised_at = h.raised_at;
      }
    });

    const sessionSeatRows = (sessionSeats || []) as Array<{
      account_id: number;
      seat_row: number | null;
      seat_col: number | null;
    }>;

    sessionSeatRows.forEach((s) => {
      const m = memberMap[s.account_id];
      if (m) {
        m.seat_row = s.seat_row ?? m.seat_row;
        m.seat_col = s.seat_col ?? m.seat_col;
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

  } catch (err: unknown) {
    console.error("API Error in overview:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
