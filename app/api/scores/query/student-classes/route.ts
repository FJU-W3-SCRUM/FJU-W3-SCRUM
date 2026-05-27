/**
 * POST /api/scores/query/student-classes
 * 取得學生的班別列表
 */

import { NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase/client";
import { getStudentClasses } from "@/lib/services/score-query-service";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { studentId } = body;

    if (!studentId) {
      return NextResponse.json(
        { ok: false, error: "studentId is required" },
        { status: 400 },
      );
    }

    const classes = await getStudentClasses(supabase, studentId);

    return NextResponse.json({ ok: true, data: classes }, { status: 200 });
  } catch (error: any) {
    console.error("POST /api/scores/query/student-classes error:", error);
    return NextResponse.json(
      { ok: false, error: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}
