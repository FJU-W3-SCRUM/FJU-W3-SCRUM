/**
 * 星級評分工具函式
 * 包含評分統計、驗證和輔助功能
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseServiceKey
);

/**
 * 評分統計數據
 */
export interface RatingStats {
  averageRating: number;
  totalRatings: number;
  distribution: {
    [key: number]: number; // 1: 10, 2: 15, 3: 20, ...
  };
  bySource: {
    teacher: number;
    group_representative: number;
  };
}

/**
 * 取得答題的評分統計
 * @param answerId 答題 ID
 * @returns 評分統計數據
 */
export async function getRatingStats(
  answerId: number
): Promise<RatingStats | null> {
  try {
    const { data: ratings, error } = await supabaseAdmin
      .from("ratings")
      .select("star, source")
      .eq("answer_id", answerId);

    if (error) {
      console.error("取得評分統計失敗:", error);
      return null;
    }

    if (!ratings || ratings.length === 0) {
      return {
        averageRating: 0,
        totalRatings: 0,
        distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        bySource: { teacher: 0, group_representative: 0 },
      };
    }

    // 計算平均評分
    const sum = ratings.reduce((acc, r) => acc + r.star, 0);
    const averageRating = sum / ratings.length;

    // 計算分佈
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    const bySource = { teacher: 0, group_representative: 0 };

    ratings.forEach((r) => {
      distribution[r.star as keyof typeof distribution]++;
      bySource[r.source as keyof typeof bySource]++;
    });

    return {
      averageRating: Math.round(averageRating * 10) / 10,
      totalRatings: ratings.length,
      distribution,
      bySource,
    };
  } catch (error) {
    console.error("getRatingStats 錯誤:", error);
    return null;
  }
}

/**
 * 取得會議中所有答題的評分統計
 * @param sessionId 會議 ID
 * @returns 按答題 ID 組織的評分統計
 */
export async function getSessionRatingStats(sessionId: number) {
  try {
    const { data: answers, error } = await supabaseAdmin
      .from("answers")
      .select("id")
      .eq("session_id", sessionId);

    if (error) {
      console.error("取得答題列表失敗:", error);
      return null;
    }

    const stats: { [key: number]: RatingStats } = {};

    for (const answer of answers || []) {
      const rating = await getRatingStats(answer.id);
      if (rating) {
        stats[answer.id] = rating;
      }
    }

    return stats;
  } catch (error) {
    console.error("getSessionRatingStats 錯誤:", error);
    return null;
  }
}

/**
 * 驗證用戶是否可以對某個答題評分
 * @param raterAccountId 評分者 ID
 * @param answerId 答題 ID
 * @param source 評分來源 (teacher | group_representative)
 * @returns 是否可以評分
 */
export async function canRate(
  raterAccountId: number,
  answerId: number,
  source: "teacher" | "group_representative"
): Promise<{ allowed: boolean; reason?: string }> {
  try {
    // 取得答題者信息
    const { data: answer, error: answerError } = await supabaseAdmin
      .from("answers")
      .select("account_id")
      .eq("id", answerId)
      .single();

    if (answerError || !answer) {
      return { allowed: false, reason: "答題不存在" };
    }

    const answererAccountId = answer.account_id;

    // 如果是報告組評分，檢查是否同組
    if (source === "group_representative") {
      // 取得評分者所在組別
      const { data: raterGroup, error: raterGroupError } = await supabaseAdmin
        .from("group_members")
        .select("group_id")
        .eq("account_id", raterAccountId)
        .single();

      if (raterGroupError) {
        return { allowed: false, reason: "無法確認評分者組別" };
      }

      // 取得被評分者所在組別
      const { data: answererGroup, error: answererGroupError } =
        await supabaseAdmin
          .from("group_members")
          .select("group_id")
          .eq("account_id", answererAccountId)
          .single();

      if (answererGroupError) {
        return { allowed: false, reason: "無法確認被評分者組別" };
      }

      if (raterGroup?.group_id === answererGroup?.group_id) {
        return { allowed: false, reason: "同組無法互相評分" };
      }
    }

    return { allowed: true };
  } catch (error) {
    console.error("canRate 錯誤:", error);
    return { allowed: false, reason: "驗證失敗" };
  }
}

/**
 * 取得用戶的評分歷史
 * @param raterAccountId 評分者 ID
 * @param limit 限制結果數量
 * @returns 評分歷史
 */
export async function getRatingHistory(
  raterAccountId: number,
  limit: number = 50
) {
  try {
    const { data, error } = await supabaseAdmin
      .from("ratings")
      .select(
        `
        id,
        star,
        source,
        created_at,
        session_id,
        answer_id,
        answers(content, account_id, accounts(name))
      `
      )
      .eq("rater_account_id", raterAccountId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("取得評分歷史失敗:", error);
      return null;
    }

    return data;
  } catch (error) {
    console.error("getRatingHistory 錯誤:", error);
    return null;
  }
}

/**
 * 刪除評分
 * @param ratingId 評分 ID
 * @param raterAccountId 評分者 ID（用於驗證權限）
 * @returns 是否刪除成功
 */
export async function deleteRating(
  ratingId: number,
  raterAccountId: number
): Promise<boolean> {
  try {
    // 驗證評分是否屬於該用戶
    const { data: rating, error: checkError } = await supabaseAdmin
      .from("ratings")
      .select("rater_account_id")
      .eq("id", ratingId)
      .single();

    if (checkError || rating?.rater_account_id !== raterAccountId) {
      console.error("無權限刪除此評分");
      return false;
    }

    // 刪除評分
    const { error: deleteError } = await supabaseAdmin
      .from("ratings")
      .delete()
      .eq("id", ratingId);

    if (deleteError) {
      console.error("刪除評分失敗:", deleteError);
      return false;
    }

    return true;
  } catch (error) {
    console.error("deleteRating 錯誤:", error);
    return false;
  }
}

/**
 * 更新評分
 * @param ratingId 評分 ID
 * @param newStar 新星級（1-5）
 * @param raterAccountId 評分者 ID（用於驗證權限）
 * @returns 是否更新成功
 */
export async function updateRating(
  ratingId: number,
  newStar: number,
  raterAccountId: number
): Promise<boolean> {
  try {
    // 驗證星級值
    if (!Number.isInteger(newStar) || newStar < 1 || newStar > 5) {
      console.error("無效的星級值");
      return false;
    }

    // 驗證評分是否屬於該用戶
    const { data: rating, error: checkError } = await supabaseAdmin
      .from("ratings")
      .select("rater_account_id")
      .eq("id", ratingId)
      .single();

    if (checkError || rating?.rater_account_id !== raterAccountId) {
      console.error("無權限修改此評分");
      return false;
    }

    // 更新評分
    const { error: updateError } = await supabaseAdmin
      .from("ratings")
      .update({
        star: newStar,
        updated_at: new Date().toISOString(),
      })
      .eq("id", ratingId);

    if (updateError) {
      console.error("更新評分失敗:", updateError);
      return false;
    }

    return true;
  } catch (error) {
    console.error("updateRating 錯誤:", error);
    return false;
  }
}

/**
 * 取得組別的評分權限檢查
 * @param groupId 組別 ID
 * @param accountId 用戶 ID
 * @returns 用戶是否是該組的組長
 */
export async function isGroupLeader(
  groupId: number,
  accountId: number
): Promise<boolean> {
  try {
    const { data, error } = await supabaseAdmin
      .from("group_members")
      .select("is_leader")
      .eq("group_id", groupId)
      .eq("account_id", accountId)
      .single();

    if (error) {
      console.error("檢查組長身份失敗:", error);
      return false;
    }

    return data?.is_leader === true;
  } catch (error) {
    console.error("isGroupLeader 錯誤:", error);
    return false;
  }
}

/**
 * 取得用戶所屬的組別
 * @param accountId 用戶 ID
 * @returns 組別 ID 列表
 */
export async function getUserGroups(accountId: number): Promise<number[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from("group_members")
      .select("group_id")
      .eq("account_id", accountId);

    if (error) {
      console.error("取得用戶所屬組別失敗:", error);
      return [];
    }

    return (data || []).map((d) => d.group_id);
  } catch (error) {
    console.error("getUserGroups 錯誤:", error);
    return [];
  }
}
