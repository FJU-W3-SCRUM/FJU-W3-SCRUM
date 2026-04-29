import { NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase/client';

/**
 * API: /api/auth/get-teacher-account-id
 * 
 * 用途：根據班級 ID 查詢該班級的老師 account_id
 * 用於解決老師評分時的 foreign key 約束問題
 * 
 * 參數：
 * - class_id: 班級 ID
 * 
 * 返回：
 * - teacher_account_id: 該班級的老師 account_id（可能為 null）
 * - teacher_name: 老師名稱
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const class_id = url.searchParams.get('class_id');

    if (!class_id) {
      return NextResponse.json(
        { error: 'Missing required parameter: class_id' },
        { status: 400 }
      );
    }

    console.log(`[get-teacher-account-id] 查詢班級: class_id=${class_id}`);

    // 查詢班級的 teacher_id
    const { data: classData, error: classError } = await supabase
      .from('classes')
      .select('id, teacher_id')
      .eq('id', class_id)
      .single();

    if (classError || !classData) {
      console.warn(`[get-teacher-account-id] 班級 ${class_id} 不存在或未設置老師`);
      return NextResponse.json(
        { teacher_account_id: null, teacher_name: null },
        { status: 200 }
      );
    }

    const teacher_account_id = classData.teacher_id;

    if (!teacher_account_id) {
      console.warn(`[get-teacher-account-id] 班級 ${class_id} 沒有設置老師 ID`);
      return NextResponse.json(
        { teacher_account_id: null, teacher_name: null },
        { status: 200 }
      );
    }

    // 根據 teacher_account_id 查詢老師詳細信息
    const { data: teacherAccount, error: teacherError } = await supabase
      .from('accounts')
      .select('id, name, student_no')
      .eq('id', teacher_account_id)
      .single();

    if (teacherError) {
      console.warn(`[get-teacher-account-id] 無法查詢老師 account ${teacher_account_id}`);
      return NextResponse.json(
        { teacher_account_id: null, teacher_name: null },
        { status: 200 }
      );
    }

    console.log(`[get-teacher-account-id] 找到老師: account_id=${teacher_account_id}, name=${teacherAccount?.name}`);

    return NextResponse.json({
      teacher_account_id: teacher_account_id,
      teacher_name: teacherAccount?.name || '未知老師'
    });

  } catch (err: any) {
    console.error('[get-teacher-account-id] Error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
