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
 * 查詢結果行 - 符合 SP3004 需求
 */
export interface StudentScoreQueryResult {
  class_id: string;
  class_name: string;
  group_name?: string;
  group_leader?: string;
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
    console.log('[queryScores] Starting query', { userId, userRole, filters });
    
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

      userClasses = [''+studentAccount.class_id];

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

    console.log('[queryScores] Sessions fetched:', sessionsData?.length || 0, 'records');

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
    // Avoid using nested relationship selects in case DB relationship metadata isn't available.
    const { data: ratingsData, error: ratingsError } = await supabase
      .from('ratings')
      .select(`id, star, answer_id, rater_account_id, source, created_at`);

    if (ratingsError) {
      throw new Error(`Failed to fetch ratings: ${ratingsError.message}`);
    }

    // Step 4b: 獲取分組信息 (支援 SP3004 需求)
    // 注意: group_members 使用 student_no 而非 account_id
    const { data: groupsData, error: groupsError } = await supabase
      .from('groups')
      .select(`id, group_name, class_id`);

    if (groupsError) {
      throw new Error(`Failed to fetch groups: ${groupsError.message}`);
    }

    const { data: groupMembersData, error: groupMembersError } = await supabase
      .from('group_members')
      .select(`id, group_id, student_no, is_leader`);

    if (groupMembersError) {
      throw new Error(`Failed to fetch group members: ${groupMembersError.message}`);
    }

    // 建立快速查詢 map: student_no -> {group_name, is_leader}
    const memberGroupMap = new Map<string, { groupName: string; isLeader: boolean }>();
    (groupMembersData || []).forEach((member: any) => {
      const group = (groupsData || []).find((g: any) => g.id === member.group_id);
      if (group && member.student_no) {
        memberGroupMap.set(String(member.student_no), {
          groupName: group.group_name || '',
          isLeader: member.is_leader || false
        });
      }
    });

    console.log('[queryScores] Groups data fetched:', groupsData?.length || 0, 'records');
    console.log('[queryScores] Group members fetched:', groupMembersData?.length || 0, 'records');
    console.log('[queryScores] Member group map size:', memberGroupMap.size);
    console.log('[queryScores] Sample member mappings:', Array.from(memberGroupMap.entries()).slice(0, 5));
    // 決定要包含的班別：若 filters.classId 指定，使用該班；學生角色則使用 userClasses；否則預設為 sessions 中出現的 class_id
    let classFilterIds: string[] = [];
    if (filters.classId) {
      classFilterIds = [filters.classId];
    } else if (userRole === 'student' && userClasses.length > 0) {
      classFilterIds = userClasses;
    } else {
      // 從 sessionsData 收集所有 class_id
      classFilterIds = Array.from(new Set((sessionsData || []).map((s: any) => s.class_id).filter(Boolean)));
    }

    // Build accounts query with optional class filter and DB-side keyword filtering
    let accountsQuery = supabase.from('accounts').select('id, student_no, name, class_id');
    if (classFilterIds.length === 1) {
      accountsQuery = accountsQuery.eq('class_id', classFilterIds[0]);
    } else if (classFilterIds.length > 1) {
      accountsQuery = accountsQuery.in('class_id', classFilterIds);
    }

    // If filters.keyword provided, apply DB-side filtering on student_no OR name (case-insensitive)
    if (filters.keyword) {
      const rawKw = filters.keyword.trim();
      // If keyword looks numeric-ish, prefer student_no contains
      if (/^\d+$/.test(rawKw)) {
        accountsQuery = accountsQuery.ilike('student_no', `%${rawKw}%`);
      } else {
        // search both student_no and name using ilike
        accountsQuery = accountsQuery.or(`student_no.ilike.%${rawKw}%,name.ilike.%${rawKw}%`);
      }
    }

    const { data: accountsData, error: accountsError } = await accountsQuery;
    if (accountsError) {
      throw new Error(`Failed to fetch accounts: ${accountsError.message}`);
    }

    console.log('[queryScores] Accounts fetched:', accountsData?.length || 0, 'records');
    console.log('[queryScores] Hand raises fetched:', handsData?.length || 0, 'records');
    console.log('[queryScores] Ratings fetched:', ratingsData?.length || 0, 'records');
    console.log('[queryScores] Class filter IDs:', classFilterIds);
    console.log('[queryScores] Keyword filter:', filters.keyword);

    // Step 5: 處理數據 - 組合所有信息
    const resultMap = new Map<string, StudentScoreQueryResult>();

    // 首先建立班級映射：class_id -> class_name
    const classNameMap = new Map<string, string>();
    (sessionsData || []).forEach((session: any) => {
      const sessionClasses = Array.isArray(session?.classes) ? session?.classes[0] : session?.classes;
      const classId = session?.class_id || sessionClasses?.id;
      const className = sessionClasses?.class_name || '';
      if (classId && className) {
        classNameMap.set(String(classId), className);
      }
    });

    console.log('[queryScores] Class name map:', Array.from(classNameMap.entries()));

    // 初始化：為每個符合班級篩選的學生建一個結果行
    // 即使該班級沒有 session，也應該創建記錄
    (accountsData || []).forEach((account: any) => {
      console.log(`[queryScores] Processing account: ${account.student_no} (${account.name}), class_id=${account.class_id}`);
      
      // 班別篩選
      if (filters.classId && String(account.class_id) !== String(filters.classId)) {
        console.log(`[queryScores] Account ${account.student_no} filtered out: classId ${account.class_id} != ${filters.classId}`);
        return;
      }

      // 關鍵字篩選
      if (filters.keyword) {
        const kw = filters.keyword.toLowerCase().trim();
        const nameMatch = account.name.toLowerCase().includes(kw);
        const studentNoMatch = account.student_no.toLowerCase().includes(kw);
        console.log(`[queryScores] Account ${account.student_no} (${account.name}) - keyword="${filters.keyword}", nameMatch=${nameMatch}, studentNoMatch=${studentNoMatch}`);
        if (!nameMatch && !studentNoMatch) {
          console.log(`[queryScores] Account ${account.student_no} (${account.name}) filtered out: keyword '${filters.keyword}' not matched`);
          return;
        }
      }

      // 為該學生在每個相關的 session 中創建結果行
      const sessionIdsForClass = (sessionsData || [])
        .filter((s: any) => String(s.class_id) === String(account.class_id))
        .map((s: any) => s.id);

      if (sessionIdsForClass.length === 0) {
        // 即使沒有 session，也為該學生創建一個基礎結果行
        const memberGroup = memberGroupMap.get(account.student_no);
        const baseKey = `no-session-${account.id}`;
        if (!resultMap.has(baseKey)) {
          console.log(`[queryScores] Creating result for ${account.student_no}: no sessions available`);
          resultMap.set(baseKey, {
            class_id: String(account.class_id) || '',
            class_name: classNameMap.get(String(account.class_id)) || '',
            group_name: memberGroup?.groupName || undefined,
            group_leader: memberGroup?.isLeader ? '組長' : undefined,
            session_id: '',
            session_title: '(無課程記錄)',
            account_id: account.id,
            student_no: account.student_no,
            name: account.name,
            raiseCount: 0,
            answerCount: 0,
            totalScore: 0
          });
        }
      } else {
        // 為每個 session 創建結果行
        sessionIdsForClass.forEach((sessionId: string) => {
          const session = (sessionsData || []).find((s: any) => s.id === sessionId);
          const sessionClasses = Array.isArray(session?.classes) ? session?.classes[0] : session?.classes;
          const memberGroup = memberGroupMap.get(account.student_no);
          const key = `${sessionId}-${account.id}`;

          if (!resultMap.has(key)) {
            console.log(`[queryScores] Creating result for ${account.student_no} in session ${sessionId}`);
            resultMap.set(key, {
              class_id: String(account.class_id) || '',
              class_name: sessionClasses?.class_name || classNameMap.get(String(account.class_id)) || '',
              group_name: memberGroup?.groupName || undefined,
              group_leader: memberGroup?.isLeader ? '組長' : undefined,
              session_id: String(sessionId) || '',
              session_title: session?.title || '',
              account_id: account.id,
              student_no: account.student_no,
              name: account.name,
              raiseCount: 0,
              answerCount: 0,
              totalScore: 0
            });
          }
        });
      }
    });

    console.log('[queryScores] Results initialized:', resultMap.size, 'records');

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
        const memberGroup = memberGroupMap.get(account.student_no);
        console.log(`[queryScores] Hand raise - Account ${account.student_no}: groupName=${memberGroup?.groupName}, isLeader=${memberGroup?.isLeader}`);
        resultMap.set(key, {
          class_id: account.class_id || '',
          class_name: sessionClasses?.class_name || '',
          group_name: memberGroup?.groupName || undefined,
          group_leader: memberGroup?.isLeader ? '組長' : undefined,
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

      // 檢查是否有對應的 answer 記錄（被點到回答）
      if (hand.status === 'answered') {
        result.answerCount += 1;
      }
    });

    // ratings 以 answer_id 參考 answers 表：先抓取相關 answers
    // 查詢所有 answers 記錄（用於統計 answer_count）
    const { data: allAnswersData, error: allAnswersErr } = await supabase
      .from('answers')
      .select('id, session_id, account_id');
    
    if (allAnswersErr) {
      throw new Error(`Failed to fetch all answers: ${allAnswersErr.message}`);
    }

    let answersData: any[] = allAnswersData || [];

    // 另外查詢有評分的 answers（用於關聯評分資料）
    const answerIds = Array.from(new Set((ratingsData || []).map((r: any) => r.answer_id).filter(Boolean)));
    if (answerIds.length > 0) {
      const { data: fetchedAnswers, error: answersErr } = await supabase
        .from('answers')
        .select('id, session_id, account_id')
        .in('id', answerIds);
      if (answersErr) {
        throw new Error(`Failed to fetch answers: ${answersErr.message}`);
      }
      // answersData 已經包含所有 answers 了，所以這裡的結果是 answersData 的子集
    }

    console.log('[queryScores] All answers fetched:', answersData?.length || 0, 'records');

    // 處理評分記錄：用 rating.answer_id 去配對 answers，再用 answers 的 session_id/account_id 去累計
    (ratingsData || []).forEach((rating: any) => {
      const answerId = rating.answer_id;
      if (!answerId) return;
      const answer = (answersData || []).find((a: any) => a.id === answerId);
      if (!answer) return;

      const session = (sessionsData || []).find((s: any) => s.id === answer.session_id);
      const accountId = answer.account_id;
      if (!session || !accountId) return;

      const key = `${session?.id}-${accountId}`;
      if (resultMap.has(key)) {
        const result = resultMap.get(key)!;
        result.totalScore += rating.star || 0;
      }
    });

    // Step 5b: 直接從 answers 表統計 answer_count，確保準確性
    // 構建 answer 計數 map: (session_id, account_id) -> count
    const answerCountMap = new Map<string, number>();
    (answersData || []).forEach((answer: any) => {
      const key = `${answer.session_id}-${answer.account_id}`;
      const count = answerCountMap.get(key) || 0;
      answerCountMap.set(key, count + 1);
    });

    // 應用 answer 計數到結果
    resultMap.forEach((result, key) => {
      const answerCount = answerCountMap.get(key) || 0;
      result.answerCount = answerCount;
    });

    // Step 6: 返回已排序的結果
    const results = Array.from(resultMap.values())
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

    console.log('[queryScores] Query complete. Results:', results.length, 'records');
    console.log('[queryScores] Result sample:', results.slice(0, 3).map(r => ({
      student_no: r.student_no,
      name: r.name,
      group_name: r.group_name,
      group_leader: r.group_leader,
      raise: r.raiseCount,
      answer: r.answerCount,
      score: r.totalScore
    })));
    return results;
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
