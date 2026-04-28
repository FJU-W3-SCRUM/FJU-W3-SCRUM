/**
 * Task02: Score Query Service
 * 
 * 提供分數查詢的業務邏輯
 * - 老師可查詢所有班別的所有學生成績
 * - 學生只能查詢同班的成績
 * - 支持班別篩選和關鍵字搜尋
 */

import { SupabaseClient } from '@supabase/supabase-js';

/**
 * 查詢結果行
 */
export interface StudentScoreQueryResult {
  class_id: string;
  class_name: string;
  session_id: string;
  session_title: string;
  account_id: string;
  student_no: string;
  name: string;
  raiseCount: number;
  answerCount: number;
  totalScore: number;
}

/**
 * 查詢篩選條件
 */
export interface ScoreQueryFilters {
  classId?: string;           // 班別 ID (可選)
  keyword?: string;           // 學號或姓名的關鍵字 (可選)
}

/**
 * 根據角色查詢成績
 * 
 * @param supabase - Supabase 客戶端
 * @param userId - 查詢者的使用者 ID
 * @param userRole - 使用者角色 ('admin' 或 'student')
 * @param filters - 查詢篩選條件
 * @returns 查詢結果
 * 
 * @example
 * // 老師查詢所有人成績
 * const results = await queryScores(supabase, 'teacher-001', 'admin', {});
 * 
 * // 老師查詢特定班別
 * const results = await queryScores(supabase, 'teacher-001', 'admin', { classId: 'class-001' });
 * 
 * // 學生查詢同班成績
 * const results = await queryScores(supabase, 'student-001', 'student', { keyword: '小' });
 */
export async function queryScores(
  supabase: SupabaseClient,
  userId: string,
  userRole: 'admin' | 'student',
  filters: ScoreQueryFilters = {}
): Promise<StudentScoreQueryResult[]> {
  try {
    let userClasses: string[] = [];

    // Step 1: 根據角色確定可查詢的班別範圍
    if (userRole === 'admin') {
      // 老師可查詢所有班別
      userClasses = [];
    } else if (userRole === 'student') {
      // 學生只能查詢自己所在的班別
      const { data: studentAccount, error: accountError } = await supabase
        .from('accounts')
        .select('class_id')
        .eq('id', userId)
        .maybeSingle();

      if (accountError) {
        throw new Error(`Failed to fetch student class: ${accountError.message}`);
      }

      if (!studentAccount?.class_id) {
        throw new Error('Student not assigned to any class');
      }

      userClasses = [studentAccount.class_id];

      // 如果學生指定了不同的班別，拒絕訪問
      if (filters.classId && !userClasses.includes(filters.classId)) {
        throw new Error('Access denied: not in that class');
      }
    }

    // Step 2: 構建基礎查詢 - 獲取所有相關數據
    // 需要 JOIN: classes, sessions, accounts, hand_raises, ratings
    const { data: sessionsData, error: sessionsError } = await supabase
      .from('sessions')
      .select(
        `
        id,
        title,
        class_id,
        classes(
          id,
          class_name
        )
      `
      );

    if (sessionsError) {
      throw new Error(`Failed to fetch sessions: ${sessionsError.message}`);
    }

    // Step 3: 獲取所有相關的舉手和評分數據
    const { data: handsData, error: handsError } = await supabase
      .from('hand_raises')
      .select(
        `
        id,
        session_id,
        account_id,
        status,
        accounts(
          id,
          student_no,
          name,
          class_id
        )
      `
      );

    if (handsError) {
      throw new Error(`Failed to fetch hand raises: ${handsError.message}`);
    }

    // Step 4: 獲取評分數據
    const { data: ratingsData, error: ratingsError } = await supabase
      .from('ratings')
      .select(
        `
        hand_raise_id,
        star,
        hand_raises(
          id,
          session_id,
          account_id
        )
      `
      );

    if (ratingsError) {
      throw new Error(`Failed to fetch ratings: ${ratingsError.message}`);
    }

    // Step 5: 處理數據 - 組合所有信息
    const resultMap = new Map<string, StudentScoreQueryResult>();

    // 處理舉手記錄
    (handsData || []).forEach((hand: any) => {
      const session = (sessionsData || []).find((s: any) => s.id === hand.session_id);
      const accountArray = Array.isArray(hand.accounts) ? hand.accounts : [hand.accounts];
      const account = accountArray[0];
      
      if (!account) return;

      const sessionClasses = Array.isArray(session?.classes) 
        ? session?.classes[0]
        : session?.classes;

      // 角色檢查：學生只能看到自己的班別
      if (
        userRole === 'student' &&
        userClasses.length > 0 &&
        !userClasses.includes(account.class_id)
      ) {
        return;
      }

      // 班別篩選
      if (filters.classId && account.class_id !== filters.classId) {
        return;
      }

      // 關鍵字篩選
      if (filters.keyword) {
        const keyword = filters.keyword.toLowerCase();
        const matchesKeyword =
          account.student_no.includes(keyword) ||
          account.name.toLowerCase().includes(keyword);
        if (!matchesKeyword) {
          return;
        }
      }

      const key = `${session?.id}-${account.id}`;

      if (!resultMap.has(key)) {
        resultMap.set(key, {
          class_id: account.class_id || '',
          class_name: sessionClasses?.class_name || '',
          session_id: session?.id || '',
          session_title: session?.title || '',
          account_id: account.id,
          student_no: account.student_no,
          name: account.name,
          raiseCount: 0,
          answerCount: 0,
          totalScore: 0
        });
      }

      const result = resultMap.get(key)!;
      result.raiseCount += 1;

      if (hand.status === 'A') {
        result.answerCount += 1;
      }
    });

    // 處理評分記錄
    (ratingsData || []).forEach((rating: any) => {
      const handRaise = rating.hand_raises;
      const hand = (handsData || []).find((h: any) => h.id === handRaise.id);
      if (hand) {
        const session = (sessionsData || []).find((s: any) => s.id === handRaise.session_id);
        const accountArray = Array.isArray(hand.accounts) ? hand.accounts : [hand.accounts];
        const account = accountArray[0];
        
        if (!account) return;
        
        const key = `${session?.id}-${account.id}`;

        if (resultMap.has(key)) {
          const result = resultMap.get(key)!;
          result.totalScore += rating.star || 0;
        }
      }
    });

    // Step 6: 返回已排序的結果
    return Array.from(resultMap.values())
      .sort((a, b) => {
        // 先按班別排序
        const classCompare = a.class_name.localeCompare(b.class_name);
        if (classCompare !== 0) return classCompare;

        // 再按課堂 ID 排序
        const sessionCompare = a.session_id.localeCompare(b.session_id);
        if (sessionCompare !== 0) return sessionCompare;

        // 最後按學號排序
        return a.student_no.localeCompare(b.student_no);
      });
  } catch (error) {
    console.error('Error in queryScores:', error);
    throw error;
  }
}

/**
 * 獲取使用者可查詢的班別列表 - 老師版本
 * 
 * @param supabase - Supabase 客戶端
 * @param teacherId - 老師 ID
 * @returns 班別列表 (id, name)
 */
export async function getTeacherClasses(
  supabase: SupabaseClient,
  teacherId: string
): Promise<Array<{ id: string; name: string }>> {
  try {
    const { data: classes, error } = await supabase
      .from('classes')
      .select('id, class_name')
      .order('class_name', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch classes: ${error.message}`);
    }

    return (classes || []).map((c: any) => ({
      id: c.id,
      name: c.class_name
    }));
  } catch (error) {
    console.error('Error in getTeacherClasses:', error);
    throw error;
  }
}

/**
 * 獲取使用者可查詢的班別列表 - 學生版本
 * 
 * @param supabase - Supabase 客戶端
 * @param studentId - 學生 ID
 * @returns 班別列表 (id, name) - 通常只有一個
 */
export async function getStudentClasses(
  supabase: SupabaseClient,
  studentId: string
): Promise<Array<{ id: string; name: string }>> {
  try {
    const { data: account, error: accountError } = await supabase
      .from('accounts')
      .select('class_id')
      .eq('id', studentId)
      .maybeSingle();

    if (accountError) {
      throw new Error(`Failed to fetch student account: ${accountError.message}`);
    }

    if (!account?.class_id) {
      return [];
    }

    const { data: classes, error } = await supabase
      .from('classes')
      .select('id, class_name')
      .eq('id', account.class_id);

    if (error) {
      throw new Error(`Failed to fetch class: ${error.message}`);
    }

    return (classes || []).map((c: any) => ({
      id: c.id,
      name: c.class_name
    }));
  } catch (error) {
    console.error('Error in getStudentClasses:', error);
    throw error;
  }
}
