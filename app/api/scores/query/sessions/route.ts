/**
 * GET /api/scores/query/sessions?classId=xxx
 * 獲取指定班級下的所有課堂列表
 */

import { NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase/client";
import { getSessions } from "@/lib/services/score-query-service";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const classId = url.searchParams.get("classId");

    const sessions = await getSessions(supabase, classId || undefined);

    return NextResponse.json({ ok: true, data: sessions }, { status: 200 });
  } catch (error: any) {
    console.error("GET /api/scores/query/sessions error:", error);
    return NextResponse.json(
      { ok: false, error: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}
