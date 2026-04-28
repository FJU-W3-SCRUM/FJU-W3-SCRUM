/**
 * Task01: Student Score Statistics Service
 * 
 * 提供學生發言統計的業務邏輯
 * - 計算被點發表次數 (answerCount)
 * - 計算舉手次數 (raiseCount)
 * - 計算評點分數 (totalScore)
 */

import { SupabaseClient } from '@supabase/supabase-js';

/**
 * 學生發言統計數據模型
 */
export interface StudentScoreData {
  account_id: string;
  student_no: string;
  name: string;
  answerCount: number;      // 被點發表次數 (status='A')
  raiseCount: number;        // 舉手次數 (總計)
  totalScore: number;        // 評點分數 (ratings.star 加總)
}

/**
 * 獲取課堂內所有學生的發言統計
 * 
 * @param supabase - Supabase 客戶端
 * @param sessionId - 課堂 ID
 * @returns 學生統計數據陣列
 * 
 * @example
 * const scores = await getStudentScoresForSession(supabase, 'session-123');
 * // 返回：
 * // [
 * //   {
 * //     account_id: 'student-001',
 * //     student_no: '414100001',
 * //     name: '林小明',
 * //     answerCount: 2,
 * //     raiseCount: 5,
 * //     totalScore: 8
 * //   },
 * //   ...
 * // ]
 */
export async function getStudentScoresForSession(
  supabase: SupabaseClient,
  sessionId: string
): Promise<StudentScoreData[]> {
  try {
    // Step 1: 獲取該課堂內所有的舉手記錄 (用於計算舉手/被點名次數)
    const { data: handsData, error: handsError } = await supabase
      .from('hand_raises')
      .select(
        `
        id,
        account_id,
        status,
        accounts:account_id(
          student_no,
          name
        )
      `
      )
      .eq('session_id', sessionId);

    if (handsError) {
      console.error('Error fetching hand raises:', handsError);
      throw new Error(`Failed to fetch hand raises: ${handsError.message}`);
    }

    // Step 2: 獲取該課堂的所有回答及其評分 (用於計算分數)
    // 使用 answers -> ratings 的關聯，通過 account_id 匹配
    const { data: answersWithRatings, error: answersError } = await supabase
      .from('answers')
      .select(
        `
        id,
        session_id,
        account_id,
        ratings(
          id,
          star
        )
      `
      )
      .eq('session_id', sessionId);

    if (answersError) {
      console.error('Error fetching answers with ratings:', answersError);
      throw new Error(`Failed to fetch answers with ratings: ${answersError.message}`);
    }

    // 建立 account_id 到評分分數的對應表
    const scoresByAccountId = new Map<string, number>();
    (answersWithRatings || []).forEach((answer: any) => {
      const accountId = answer.account_id;
      const ratings = answer.ratings || [];
      const answerScore = ratings.reduce((sum: number, rating: any) => sum + (rating.star || 0), 0);
      
      if (answerScore > 0) {
        const currentScore = scoresByAccountId.get(accountId) || 0;
        scoresByAccountId.set(accountId, currentScore + answerScore);
      }
    });

    // Step 3: 處理數據 - 按學生分組並計算統計
    const studentMap = new Map<string, StudentScoreData>();

    // 處理舉手記錄
    (handsData || []).forEach((hand: any) => {
      const accountId = hand.account_id;
      const account = hand.accounts;
      const studentNo = account?.student_no || '';

      if (!studentMap.has(accountId)) {
        studentMap.set(accountId, {
          account_id: accountId,
          student_no: studentNo,
          name: account?.name || '',
          answerCount: 0,
          raiseCount: 0,
          totalScore: 0
        });
      }

      const student = studentMap.get(accountId)!;
      
      // 計數所有舉手記錄
      student.raiseCount += 1;
      
      // 只計算 status='A' 的被點發表次數
      if (hand.status === 'A') {
        student.answerCount += 1;
      }
    });

    // 添加評分分數 (從 answers->ratings 關聯中獲取)
    studentMap.forEach((student) => {
      if (scoresByAccountId.has(student.account_id)) {
        student.totalScore = scoresByAccountId.get(student.account_id) || 0;
      }
    });

    // 返回已排序的結果 (按學號排序)
    return Array.from(studentMap.values()).sort((a, b) =>
      a.student_no.localeCompare(b.student_no)
    );
  } catch (error) {
    console.error('Error in getStudentScoresForSession:', error);
    throw error;
  }
}

/**
 * 獲取單一學生在特定課堂的發言統計
 * 
 * @param supabase - Supabase 客戶端
 * @param sessionId - 課堂 ID
 * @param accountId - 學生帳號 ID
 * @returns 學生統計數據
 * 
 * @throws 如果學生不存在於該課堂
 * 
 * @example
 * const score = await getStudentScoreForSession(supabase, 'session-123', 'student-001');
 */
export async function getStudentScoreForSession(
  supabase: SupabaseClient,
  sessionId: string,
  accountId: string
): Promise<StudentScoreData> {
  try {
    // Step 1: 驗證學生存在於該課堂的任何課程活動中
    const { data: account, error: accountError } = await supabase
      .from('accounts')
      .select('id, student_no, name')
      .eq('id', accountId)
      .maybeSingle();

    if (accountError) {
      throw new Error(`Failed to fetch account: ${accountError.message}`);
    }

    if (!account) {
      throw new Error(`Student not found in session`);
    }

    // Step 2: 獲取該學生在該課堂的舉手記錄
    const { data: handsData, error: handsError } = await supabase
      .from('hand_raises')
      .select('id, status')
      .eq('session_id', sessionId)
      .eq('account_id', accountId);

    if (handsError) {
      throw new Error(`Failed to fetch hand raises: ${handsError.message}`);
    }

    // Step 3: 獲取該學生在該課堂的回答及評分記錄 (使用 answers->ratings，通過 account_id)
    const { data: answersWithRatings, error: answersError } = await supabase
      .from('answers')
      .select(
        `
        id,
        session_id,
        ratings(
          id,
          star
        )
      `
      )
      .eq('session_id', sessionId)
      .eq('account_id', accountId);

    if (answersError) {
      throw new Error(`Failed to fetch answers with ratings: ${answersError.message}`);
    }

    // Step 4: 計算統計
    let answerCount = 0;
    let raiseCount = (handsData || []).length;
    let totalScore = 0;

    // 計算被點名次數
    (handsData || []).forEach((hand: any) => {
      if (hand.status === 'A') {
        answerCount += 1;
      }
    });

    // 計算分數 (從 answers->ratings 中獲取)
    (answersWithRatings || []).forEach((answer: any) => {
      const ratings = answer.ratings || [];
      ratings.forEach((rating: any) => {
        totalScore += rating.star || 0;
      });
    });

    return {
      account_id: accountId,
      student_no: account.student_no,
      name: account.name,
      answerCount,
      raiseCount,
      totalScore
    };
  } catch (error) {
    console.error('Error in getStudentScoreForSession:', error);
    throw error;
  }
}

/**
 * 格式化學生分數用於 UI 呈現
 * 格式: "名字 (學號)<組長> (answer/raise; score)"
 * 
 * @param student - 學生統計數據
 * @param isGroupLeader - 是否為組長
 * @returns 格式化的字符串
 * 
 * @example
 * const formatted = formatStudentScore(
 *   { account_id: 'student-001', student_no: '414100001', name: '林小明', answerCount: 1, raiseCount: 3, totalScore: 5 },
 *   true
 * );
 * // 返回: "林小明 (414100001)<組長>     (1/3; 5)"
 */
export function formatStudentScore(
  student: StudentScoreData,
  isGroupLeader: boolean = false
): string {
  const leaderTag = isGroupLeader ? '<組長>' : '';
  return (
    `${student.name} (${student.student_no})${leaderTag}     ` +
    `(${student.answerCount}/${student.raiseCount}; ${student.totalScore})`
  );
}
