import { NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase/client';

/**
 * API: /api/auth/get-account-id-by-class
 * 
 * 用途：解決同一學號(student_no)在不同班級有不同account_id的問題
 * 當學生進入某課堂時，需要根據該課堂的class_id查詢正確的account_id
 * 
 * 參數：
 * - student_no: 學號
 * - class_id: 班級ID
 * 
 * 返回：
 * - account_id: 該學號在該班級對應的account_id
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const student_no = url.searchParams.get('student_no');
    const class_id = url.searchParams.get('class_id');

    if (!student_no || !class_id) {
      return NextResponse.json(
        { error: 'Missing required parameters: student_no, class_id' },
        { status: 400 }
      );
    }

    console.log(`[get-account-id-by-class] 查詢: student_no=${student_no}, class_id=${class_id}`);

    // 根據 student_no 和 class_id 查詢對應的 account_id
    const { data: account, error } = await supabase
      .from('accounts')
      .select('id, student_no, name, class_id')
      .eq('student_no', student_no)
      .eq('class_id', class_id)
      .single();

    if (error) {
      console.error('[get-account-id-by-class] Database error:', error);
      return NextResponse.json(
        { error: `Failed to find account: ${error.message}` },
        { status: 500 }
      );
    }

    if (!account) {
      console.warn(`[get-account-id-by-class] No account found for student_no=${student_no}, class_id=${class_id}`);
      return NextResponse.json(
        { error: `Account not found for student_no=${student_no} in class_id=${class_id}` },
        { status: 404 }
      );
    }

    console.log(`[get-account-id-by-class] 找到 account_id: ${account.id}`);

    return NextResponse.json({
      account_id: account.id,
      student_no: account.student_no,
      name: account.name,
      class_id: account.class_id
    });

  } catch (err: any) {
    console.error('[get-account-id-by-class] Error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
