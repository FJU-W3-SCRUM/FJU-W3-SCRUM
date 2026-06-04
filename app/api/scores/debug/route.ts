import { NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase/client';

/**
 * GET /api/scores/debug
 * 診斷分數查詢的資料庫狀態
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');
    const userRole = url.searchParams.get('userRole') || 'student';

    const debug: any = {
      timestamp: new Date().toISOString(),
      userId,
      userRole,
      data: {}
    };

    // 檢查賬戶
    if (userId) {
      const { data: account, error: accountErr } = await supabase
        .from('accounts')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      debug.data.userAccount = { error: accountErr?.message, data: account };
    }

    // 統計各表的記錄數
    const { count: classCount } = await supabase
      .from('classes')
      .select('*', { count: 'exact', head: true });
    debug.data.classCount = classCount;

    const { count: sessionCount } = await supabase
      .from('sessions')
      .select('*', { count: 'exact', head: true });
    debug.data.sessionCount = sessionCount;

    const { count: accountCount } = await supabase
      .from('accounts')
      .select('*', { count: 'exact', head: true });
    debug.data.accountCount = accountCount;

    const { count: handRaiseCount } = await supabase
      .from('hand_raises')
      .select('*', { count: 'exact', head: true });
    debug.data.handRaiseCount = handRaiseCount;

    const { count: ratingCount } = await supabase
      .from('ratings')
      .select('*', { count: 'exact', head: true });
    debug.data.ratingCount = ratingCount;

    const { count: answerCount } = await supabase
      .from('answers')
      .select('*', { count: 'exact', head: true });
    debug.data.answerCount = answerCount;

    // 樣本數據
    const { data: sampleClasses } = await supabase
      .from('classes')
      .select('*')
      .limit(5);
    debug.data.sampleClasses = sampleClasses;

    const { data: sampleSessions } = await supabase
      .from('sessions')
      .select('*')
      .limit(5);
    debug.data.sampleSessions = sampleSessions;

    const { data: sampleAccounts } = await supabase
      .from('accounts')
      .select('id, student_no, name, class_id, role')
      .limit(5);
    debug.data.sampleAccounts = sampleAccounts;

    const { data: sampleHandRaises } = await supabase
      .from('hand_raises')
      .select('*')
      .limit(5);
    debug.data.sampleHandRaises = sampleHandRaises;

    return NextResponse.json(debug, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: error.message || 'Debug error'
      },
      { status: 500 }
    );
  }
}
