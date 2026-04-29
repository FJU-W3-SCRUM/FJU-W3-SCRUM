import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: NextRequest) {
  try {
    // 解析請求體
    const body = await request.json();
    const { sessionId, answerId, raterAccountId, star, source } = body;

    // 驗證必要欄位
    if (!sessionId || !answerId || !raterAccountId || !star) {
      return NextResponse.json(
        {
          error: "缺少必要欄位: sessionId, answerId, raterAccountId, star",
        },
        { status: 400 }
      );
    }

    // 驗證 star 值（1-5）
    if (!Number.isInteger(star) || star < 1 || star > 5) {
      return NextResponse.json(
        { error: "星級必須介於 1 到 5 之間" },
        { status: 400 }
      );
    }

    // 驗證 source 值
    const validSources = ["teacher", "group_representative"];
    if (!validSources.includes(source)) {
      return NextResponse.json(
        { error: "無效的評分來源" },
        { status: 400 }
      );
    }

    // ===== 防弊機制：防止自我評分 =====

    // 1. 取得答題者的資訊（被評分者）
    const { data: answerData, error: answerError } = await supabase
      .from("answers")
      .select("account_id, session_id")
      .eq("id", answerId)
      .single();

    if (answerError || !answerData) {
      return NextResponse.json(
        { error: "找不到該答題紀錄" },
        { status: 404 }
      );
    }

    const answererAccountId = answerData.account_id;

    // 2. 報告組評分時：檢查評分者和被評分者是否在同一組
    if (source === "group_representative") {
      // 取得評分者所在的組別
      const { data: raterGroupData, error: raterGroupError } = await supabase
        .from("group_members")
        .select("group_id")
        .eq("account_id", raterAccountId)
        .eq("is_leader", true)
        .single();

      if (raterGroupError) {
        return NextResponse.json(
          { error: "無法確認您的組別身份" },
          { status: 403 }
        );
      }

      // 取得被評分者所在的組別
      const { data: answererGroupData, error: answererGroupError } =
        await supabase
          .from("group_members")
          .select("group_id")
          .eq("account_id", answererAccountId)
          .single();

      if (answererGroupError) {
        return NextResponse.json(
          { error: "無法確認被評分者的組別身份" },
          { status: 403 }
        );
      }

      // 防止自我評分：同一組不能互相評分（或防止自己給自己評分）
      if (raterGroupData?.group_id === answererGroupData?.group_id) {
        return NextResponse.json(
          { error: "無法對同組成員或自己評分" },
          { status: 403 }
        );
      }
    }

    // ===== 插入評分紀錄 =====

    const { data: ratingData, error: insertError } = await supabase
      .from("ratings")
      .insert({
        session_id: sessionId,
        answer_id: answerId,
        rater_account_id: raterAccountId,
        star,
        source:
          source === "teacher" ? "teacher" : "group_representative",
        status: "approved",
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error("插入評分失敗:", insertError);
      return NextResponse.json(
        { error: "評分提交失敗，請稍後重試" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "評分已送出",
        rating: ratingData,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("星級評分 API 錯誤:", error);
    return NextResponse.json(
      { error: "服務器內部錯誤" },
      { status: 500 }
    );
  }
}
