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
  session_starts_at: string | null;
  account_id: string;
  student_no: string;
  name: string;
  raiseCount: number;
  answerCount: number;
  totalScore: number;
  ratingDetails: number[];
}

/**
 * 查詢篩選條件
 */
export interface ScoreQueryFilters {
  classId?: string;           // 班別 ID (可選)
  keyword?: string;           // 學號或姓名的關鍵字 (可選)
}

type SessionRow = {
  id: string;
  title: string;
  class_id: string;
  starts_at?: string | null;
  classes?:
    | { id: string; class_name: string }
    | Array<{ id: string; class_name: string }>
    | null;
};

type AccountDetailRow = {
  id: string;
  student_no: string;
  name: string;
  class_id: string;
};

type HandRaiseRow = {
  id: string;
  session_id: string;
  account_id: string;
  status: string;
  accounts?: AccountDetailRow | AccountDetailRow[] | null;
};

type AnswerWithRatingsRow = {
  id: string;
  session_id: string;
  account_id: string;
  ratings?: Array<{ star: number | null }> | null;
};

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
      userClasses = [];
    } else if (userRole === 'student') {
      const { data: studentAccount, error: accountError } = await supabase
        .from('accounts')
        .select('class_id, student_no')
        .eq('id', userId)
        .maybeSingle();

      if (accountError) {
        throw new Error(`Failed to fetch student class: ${accountError.message}`);
      }

      if (!studentAccount?.class_id) {
        throw new Error('Student not assigned to any class');
      }

      // 找出同 student_no 在所有班別的 class_id
      if (studentAccount.student_no) {
        const { data: allAccounts } = await supabase
          .from('accounts')
          .select('class_id')
          .eq('student_no', studentAccount.student_no);
        userClasses = (allAccounts || []).map((a) => String(a.class_id)).filter(Boolean);
      } else {
        userClasses = [String(studentAccount.class_id)];
      }

      if (filters.classId && !userClasses.includes(String(filters.classId))) {
        throw new Error('Access denied: not in that class');
      }
    }

    const { data: sessionsData, error: sessionsError } = await supabase
      .from('sessions')
      .select(
        `
        id,
        title,
        class_id,
        starts_at,
        classes(
          id,
          class_name
        )
      `
      );

    if (sessionsError) {
      throw new Error(`Failed to fetch sessions: ${sessionsError.message}`);
    }

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

    const { data: answersData, error: ratingsError } = await supabase
      .from('answers')
      .select('id, session_id, account_id, ratings(star)');

    if (ratingsError) {
      throw new Error(`Failed to fetch ratings: ${ratingsError.message}`);
    }

    // 建立 session_id+account_id → 總分 的對應表
    const scoreMap = new Map<string, number>();
    // 建立 session_id+account_id → 每次評分星數陣列 的對應表
    const ratingsMap = new Map<string, number[]>();
    ((answersData || []) as AnswerWithRatingsRow[]).forEach((answer) => {
      const key = `${answer.session_id}-${answer.account_id}`;
      const stars = (answer.ratings ?? []).map((r) => r.star ?? 0).filter((s) => s > 0);
      const total = stars.reduce((sum, s) => sum + s, 0);
      scoreMap.set(key, (scoreMap.get(key) ?? 0) + total);
      if (stars.length > 0) {
        ratingsMap.set(key, [...(ratingsMap.get(key) ?? []), ...stars]);
      }
    });

    const sessionsRows = (sessionsData || []) as SessionRow[];
    const handsRows = (handsData || []) as HandRaiseRow[];
    const resultMap = new Map<string, StudentScoreQueryResult>();

    handsRows.forEach((hand) => {
      const session = sessionsRows.find((s) => s.id === hand.session_id);
      const accountArray = Array.isArray(hand.accounts)
        ? hand.accounts
        : hand.accounts
        ? [hand.accounts]
        : [];
      const account = accountArray[0];

      if (!account) return;

      const sessionClasses = Array.isArray(session?.classes)
        ? session.classes[0]
        : session?.classes;

      if (
        userRole === 'student' &&
        userClasses.length > 0 &&
        !userClasses.includes(String(account.class_id))
      ) {
        return;
      }

      if (filters.classId && String(account.class_id) !== String(filters.classId)) {
        return;
      }

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
          session_starts_at: session?.starts_at ?? null,
          account_id: account.id,
          student_no: account.student_no,
          name: account.name,
          raiseCount: 0,
          answerCount: 0,
          totalScore: 0,
          ratingDetails: [],
        });
      }

      const result = resultMap.get(key)!;
      result.raiseCount += 1;

      if (hand.status === 'A') {
        result.answerCount += 1;
      }
    });

    resultMap.forEach((result, key) => {
      result.totalScore = scoreMap.get(key) ?? 0;
      result.ratingDetails = ratingsMap.get(key) ?? [];
      // Sync answerCount with actual rating records to avoid discrepancy
      if (result.ratingDetails.length > 0) {
        result.answerCount = result.ratingDetails.length;
      }
    });

    return Array.from(resultMap.values()).sort((a, b) => {
      const classCompare = a.class_name.localeCompare(b.class_name);
      if (classCompare !== 0) return classCompare;

      const sessionCompare = String(a.session_id).localeCompare(String(b.session_id));
      if (sessionCompare !== 0) return sessionCompare;

      return a.student_no.localeCompare(b.student_no);
    });
  } catch (error) {
    console.error('Error in queryScores:', error);
    throw error;
  }
}

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

    const classesRows = (classes || []) as Array<{ id: string; class_name: string }>;
    return classesRows.map((c) => ({
      id: c.id,
      name: c.class_name,
    }));
  } catch (error) {
    console.error('Error in getTeacherClasses:', error);
    throw error;
  }
}

export async function getStudentClasses(
  supabase: SupabaseClient,
  studentId: string
): Promise<Array<{ id: string; name: string }>> {
  try {
    const { data: account, error: accountError } = await supabase
      .from('accounts')
      .select('class_id, student_no')
      .eq('id', studentId)
      .maybeSingle();

    if (accountError) {
      throw new Error(`Failed to fetch student account: ${accountError.message}`);
    }

    if (!account?.class_id) {
      return [];
    }

    // 找出同 student_no 在所有班別的 class_id（學生可能在多個班別）
    let classIds: unknown[] = [account.class_id];
    if (account.student_no) {
      const { data: allAccounts } = await supabase
        .from('accounts')
        .select('class_id')
        .eq('student_no', account.student_no);
      classIds = [...new Set((allAccounts || []).map((a) => a.class_id).filter(Boolean))];
    }

    const { data: classes, error } = await supabase
      .from('classes')
      .select('id, class_name')
      .in('id', classIds)
      .order('class_name', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch class: ${error.message}`);
    }

    const classesRows = (classes || []) as Array<{ id: string; class_name: string }>;
    return classesRows.map((c) => ({
      id: String(c.id),
      name: c.class_name,
    }));
  } catch (error) {
    console.error('Error in getStudentClasses:', error);
    throw error;
  }
}
