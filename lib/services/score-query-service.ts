/**
 * Task02: Score Query Service
 *
 * 提供分數查詢的業務邏輯
 * - 老師可查詢所有班別的所有學生成績
 * - 學生只能查詢同班的成績
 * - 支持班別篩選和關鍵字搜尋
 */

import { SupabaseClient } from "@supabase/supabase-js";

/**
 * 評分詳情（包含給分人信息）
 */
export interface ScoreDetail {
  star: number;
  rater_name?: string;
  rater_role: "teacher" | "group_leader" | "group_member"; // 老師、組長或組員
  rater_label?: string; // 顯示用：老師、第幾組組長、第幾組給分
  rater_group_name?: string;
  created_at?: string;
}

/**
 * 查詢結果行（符合 SP3004 規格）
 */
export interface StudentScoreQueryResult {
  class_id: string;
  class_name: string;
  group_name?: string;
  group_leader?: boolean;
  session_id: string;
  session_title: string;
  session_date?: string;
  account_id: string;
  student_no: string;
  name: string;
  raise_count: number; // 舉手次數
  answer_count: number; // 被點回答次數
  total_score: number; // 總評點分數
  score_details?: ScoreDetail[]; // 評分詳情清單
}

/**
 * 查詢篩選條件
 */
export interface ScoreQueryFilters {
  classId?: string; // 班別 ID (可選)
  sessionId?: string; // 課堂 ID (可選)
  keyword?: string; // 學號或姓名的關鍵字 (可選)
}

/**
 * 根據角色查詢成績（根據 SP3004 規格重新實現）
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
 * // 查詢特定課堂的成績
 * const results = await queryScores(supabase, 'teacher-001', 'admin', { sessionId: 'session-001' });
 *
 * // 學生查詢同班成績
 * const results = await queryScores(supabase, 'student-001', 'student', { keyword: '小' });
 */
/**
 * 根據角色查詢成績（根據 SP3004 規格重新實現）
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
 * // 查詢特定課堂的成績
 * const results = await queryScores(supabase, 'teacher-001', 'admin', { sessionId: 'session-001' });
 *
 * // 學生查詢同班成績
 * const results = await queryScores(supabase, 'student-001', 'student', { keyword: '小' });
 */
export async function queryScores(
  supabase: SupabaseClient,
  userId: string,
  userRole: "admin" | "student",
  filters: ScoreQueryFilters = {},
): Promise<StudentScoreQueryResult[]> {
  try {
    // Step 1: 根據角色確定可查詢的班別範圍
    let classId: number | null = null;

    if (userRole === "admin") {
      // 老師可查詢所有班別
    } else if (userRole === "student") {
      // 學生只能查詢自己所在的班別
      const { data: studentAccount, error: accountError } = await supabase
        .from("accounts")
        .select("class_id")
        .eq("id", userId)
        .maybeSingle();

      if (accountError) {
        throw new Error(
          `Failed to fetch student class: ${accountError.message}`,
        );
      }

      if (!studentAccount?.class_id) {
        return []; // 學生未分配到班級
      }

      classId = studentAccount.class_id;

      // 如果學生指定了不同的班別，拒絕訪問
      if (filters.classId && filters.classId !== String(classId)) {
        throw new Error("Access denied: not in that class");
      }
    }

    // Step 2: 決定使用哪個 RPC 函數
    // 如果選擇了課堂 (sessionId)，使用逐課堂查詢函數
    // 如果未選課堂，使用聚合函數（加總所有課堂）
    let rawResults: any[] = [];
    let isAggregated = false;

    if (filters.sessionId) {
      // 逐課堂查詢模式
      const { data, error: queryError } = await supabase.rpc(
        "query_student_scores",
        {
          p_class_id: filters.classId ? parseInt(filters.classId) : classId,
          p_session_id: parseInt(filters.sessionId),
          p_keyword: filters.keyword || null,
          p_user_id: userId,
          p_user_role: userRole,
        },
      );

      if (queryError) {
        console.error("Failed to execute query_student_scores:", queryError);
        throw new Error(`Failed to query scores: ${queryError.message}`);
      }
      rawResults = data || [];
    } else {
      // 全部課堂聚合模式
      const { data, error: queryError } = await supabase.rpc(
        "query_student_scores_aggregated",
        {
          p_class_id: filters.classId ? parseInt(filters.classId) : classId,
          p_keyword: filters.keyword || null,
          p_user_id: userId,
          p_user_role: userRole,
        },
      );

      if (queryError) {
        console.error(
          "Failed to execute query_student_scores_aggregated:",
          queryError,
        );
        throw new Error(`Failed to query scores: ${queryError.message}`);
      }
      rawResults = data || [];
      isAggregated = true;
    }

    // Step 3: 轉換結果格式
    const results: StudentScoreQueryResult[] = (rawResults || []).map(
      (row: any) => {
        if (isAggregated) {
          // 聚合結果：每行代表一個學生的總體統計
          return {
            class_id: String(row.class_id),
            class_name: row.class_name,
            group_name: row.group_name,
            group_leader: row.group_leader === "組長",
            session_id: "aggregated", // 特殊標記
            session_title: "全部課堂統計",
            session_date: undefined,
            account_id: String(row.student_id),
            student_no: row.student_no,
            name: row.name,
            raise_count: Number(row.total_raise_count || 0),
            answer_count: Number(row.total_answer_count || 0),
            total_score: Number(row.total_score || 0),
            score_details: [],
          };
        } else {
          // 逐課堂結果：每行代表一個學生在一個課堂的表現
          return {
            class_id: String(row.class_id),
            class_name: row.class_name,
            group_name: row.group_name,
            group_leader: row.group_leader === "組長",
            session_id: String(row.session_id),
            session_title: row.title,
            session_date: row.created_at,
            account_id: String(row.student_id),
            student_no: row.student_no,
            name: row.name,
            raise_count: Number(row.raise_count || 0),
            answer_count: Number(row.answer_count || 0),
            total_score: Number(row.total_score || 0),
            score_details: [],
          };
        }
      },
    );

    // Step 4: 如需要評分詳情，再單獨查詢
    if (rawResults && rawResults.length > 0) {
      await enrichScoreDetails(supabase, results);
    }

    return results;
  } catch (error) {
    console.error("Error in queryScores:", error);
    throw error;
  }
}

/**
 * 補充評分詳情（給分人信息）
 */
async function enrichScoreDetails(
  supabase: SupabaseClient,
  results: StudentScoreQueryResult[],
): Promise<void> {
  try {
    // 檢查是否為聚合模式（全部課堂）
    const isAggregated = results.some((r) => r.session_id === "aggregated");

    let sessionIds: number[] = [];
    if (isAggregated) {
      const classIds = Array.from(
        new Set(
          results
            .map((r) => parseInt(r.class_id, 10))
            .filter((id) => !Number.isNaN(id)),
        ),
      );

      if (classIds.length === 0) return;

      const { data: sessionsData, error: sessionsError } = await supabase
        .from("sessions")
        .select("id")
        .in("class_id", classIds);

      if (sessionsError) {
        console.warn("Failed to fetch sessions for aggregated details:", sessionsError);
        return;
      }

      sessionIds = (sessionsData || [])
        .map((session: any) => Number(session.id))
        .filter((id) => !Number.isNaN(id));
    } else {
      // 提取所有涉及的課堂 ID
      sessionIds = Array.from(
        new Set(
          results
            .map((r) => parseInt(r.session_id, 10))
            .filter((id) => !Number.isNaN(id)),
        ),
      );
    }

    if (sessionIds.length === 0) return;

    // 查詢所有該課堂的評分記錄
    const { data: ratingsData, error: ratingsError } = await supabase
      .from("ratings")
      .select(
        "id, session_id, answer_id, star, rater_account_id, source, created_at",
      )
      .in("session_id", sessionIds)
      .eq("status", "approved");

    if (ratingsError) {
      console.warn("Failed to fetch ratings for enrichment:", ratingsError);
      return;
    }

    // 獲取給分人信息
    const raterIds = Array.from(
      new Set(
        (ratingsData || []).map((r: any) => r.rater_account_id).filter(Boolean),
      ),
    );
    if (raterIds.length === 0) return;

    const { data: raters, error: ratersError } = await supabase
      .from("accounts")
      .select("id, student_no, name, role, class_id")
      .in("id", raterIds);

    if (ratersError) {
      console.warn("Failed to fetch rater names:", ratersError);
      return;
    }

    const raterNameMap = new Map<string, string>();
    const raterRoleMap = new Map<string, string>(); // 新增：存儲給分人的 role
    const raterStudentNoMap = new Map<string, string>();
    const raterClassIdMap = new Map<string, string>();
    (raters || []).forEach((r: any) => {
      raterNameMap.set(String(r.id), r.name || "未知");
      raterRoleMap.set(String(r.id), r.role || "");
      raterStudentNoMap.set(String(r.id), r.student_no || "");
      raterClassIdMap.set(String(r.id), String(r.class_id || ""));
    });

    // 查詢給分人的組別與組長身份。group_members 使用 student_no，不是 account_id。
    const raterStudentNos = Array.from(
      new Set(
        Array.from(raterStudentNoMap.values()).filter((studentNo) =>
          Boolean(studentNo),
        ),
      ),
    );

    const { data: memberData, error: memberError } =
      raterStudentNos.length > 0
        ? await supabase
            .from("group_members")
            .select("student_no, is_leader, groups(group_name, class_id)")
            .in("student_no", raterStudentNos)
        : { data: [], error: null };

    if (memberError) {
      console.warn("Failed to fetch group membership:", memberError);
    }

    const raterGroupMap = new Map<
      string,
      { groupName: string; isLeader: boolean }
    >();
    (memberData || []).forEach((m: any) => {
      const group = Array.isArray(m.groups) ? m.groups[0] : m.groups;
      const classId = String(group?.class_id || "");
      const studentNo = String(m.student_no || "");
      if (!studentNo || !classId) return;

      raterGroupMap.set(`${studentNo}-${classId}`, {
        groupName: group?.group_name || "",
        isLeader: m.is_leader || false,
      });
    });

    // 獲取 answers 映射（answer_id -> account_id）
    const { data: answersData, error: answersError } = await supabase
      .from("answers")
      .select("id, session_id, account_id")
      .in("session_id", sessionIds);

    if (answersError) {
      console.warn("Failed to fetch answers:", answersError);
      return;
    }

    const answerMap = new Map<number, { accountId: number; sessionId: number }>();
    (answersData || []).forEach((a: any) => {
      answerMap.set(a.id, {
        accountId: a.account_id,
        sessionId: a.session_id,
      });
    });

    // 為每個評分找到對應的學生，並補充詳情
    (ratingsData || []).forEach((rating: any) => {
      const answer = answerMap.get(rating.answer_id);
      if (!answer) return;

      const result = isAggregated
        ? results.find((r) => r.account_id === String(answer.accountId))
        : results.find(
            (r) =>
              `${r.session_id}-${r.account_id}` ===
              `${answer.sessionId}-${answer.accountId}`,
          );

      if (result) {
        const raterId = String(rating.rater_account_id);
        const raterName = raterNameMap.get(raterId) || "未知";

        // 改進邏輯：優先判斷是否為真正的老師
        const raterAccountRole = raterRoleMap.get(raterId) || "";
        const isTeacher =
          raterAccountRole === "teacher" ||
          raterAccountRole === "admin" ||
          (!raterId && rating.source === "teacher");
        const raterStudentNo = raterStudentNoMap.get(raterId) || "";
        const raterClassId = raterClassIdMap.get(raterId) || "";
        const raterGroup = raterGroupMap.get(
          `${raterStudentNo}-${raterClassId}`,
        );
        const isGroupLeader = raterGroup?.isLeader || false;
        const groupLabel = formatGroupLabel(raterGroup?.groupName);

        // 優先級：account.role === "teacher" → 標記為老師；否則如果是組長 → 標記為組長
        const raterRole: "teacher" | "group_leader" | "group_member" =
          isTeacher
          ? "teacher"
          : isGroupLeader
            ? "group_leader"
            : "group_member";
        const raterLabel = isTeacher
          ? "老師"
          : groupLabel
            ? `${groupLabel}${isGroupLeader ? "組長" : "給分"}`
            : isGroupLeader
              ? "組長"
              : "給分";

        if (!result.score_details) {
          result.score_details = [];
        }

        result.score_details.push({
          star: rating.star || 0,
          rater_name: raterName,
          rater_role: raterRole,
          rater_label: raterLabel,
          rater_group_name: raterGroup?.groupName,
          created_at: rating.created_at,
        });
      }
    });
  } catch (error) {
    console.warn("Error enriching score details:", error);
    // 不拋出錯誤，因為詳情是可選的
  }
}

function formatGroupLabel(groupName?: string): string {
  const name = groupName?.trim();
  if (!name) return "";
  if (/^\d+$/.test(name)) return `第${name}組`;
  return name;
}

/**
 * 獲取所有可查詢的課堂（session）列表
 *
 * @param supabase - Supabase 客戶端
 * @param classId - 班別 ID
 * @returns 課堂列表 (id, title, class_name, created_at)
 */
export async function getSessions(
  supabase: SupabaseClient,
  classId?: string,
): Promise<
  Array<{ id: string; title: string; class_name: string; created_at: string }>
> {
  try {
    let query = supabase
      .from("sessions")
      .select(
        `
        id,
        title,
        created_at,
        classes(class_name)
      `,
      )
      .order("created_at", { ascending: false });

    if (classId) {
      query = query.eq("class_id", classId);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch sessions: ${error.message}`);
    }

    return (data || []).map((s: any) => ({
      id: String(s.id),
      title: s.title || "未命名課堂",
      class_name:
        (Array.isArray(s.classes) ? s.classes[0] : s.classes)?.class_name || "",
      created_at: s.created_at || "",
    }));
  } catch (error) {
    console.error("Error in getSessions:", error);
    throw error;
  }
}

/**
 * 獲取使用者可查詢的班別列表 - 老師版本
 *
 * @param supabase - Supabase 客戶端
 * @param teacherId - 老師 ID (此參數為了向後相容，但老師可查詢所有班別)
 * @returns 班別列表 (id, name)
 */
export async function getTeacherClasses(
  supabase: SupabaseClient,
  teacherId: string,
): Promise<Array<{ id: string; name: string }>> {
  try {
    const { data: classes, error } = await supabase
      .from("classes")
      .select("id, class_name")
      .order("id", { ascending: false }); // 按 ID 降序，最新的在前

    if (error) {
      throw new Error(`Failed to fetch classes: ${error.message}`);
    }

    return (classes || []).map((c: any) => ({
      id: String(c.id),
      name: c.class_name || "未命名班級",
    }));
  } catch (error) {
    console.error("Error in getTeacherClasses:", error);
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
  studentId: string,
): Promise<Array<{ id: string; name: string }>> {
  try {
    const { data: account, error: accountError } = await supabase
      .from("accounts")
      .select("id, class_id")
      .eq("id", studentId)
      .maybeSingle();

    if (accountError) {
      throw new Error(
        `Failed to fetch student account: ${accountError.message}`,
      );
    }

    if (!account?.class_id) {
      return [];
    }

    // 直接查詢classes表獲取班級名稱
    const { data: classData, error: classError } = await supabase
      .from("classes")
      .select("id, class_name")
      .eq("id", account.class_id)
      .maybeSingle();

    if (classError) {
      throw new Error(`Failed to fetch class: ${classError.message}`);
    }

    return [
      {
        id: String(account.class_id),
        name: classData?.class_name || "未命名班級",
      },
    ];
  } catch (error) {
    console.error("Error in getStudentClasses:", error);
    throw error;
  }
}
