import { NextResponse } from "next/server";
import supabase from "@/lib/supabase/client";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const class_id = url.searchParams.get("class_id");
    const q = url.searchParams.get("q");
    const page = parseInt(url.searchParams.get("page") || "1", 10);
    const page_size = parseInt(url.searchParams.get("page_size") || "10", 10);

    // Build query with JOIN to classes table
    let query = supabase
      .from("accounts")
      .select("id,student_no,name,email,role,class_id,classes(class_name)", { count: "exact" });

    if (class_id) {
      query = query.eq("class_id", class_id);
    }

    if (q) {
      query = query.or(`student_no.ilike.%${q}%,name.ilike.%${q}%`);
    }

    // Get total count before pagination
    const countQuery = query.clone ? supabase
      .from("accounts")
      .select("id", { count: "exact" }) : null;

    // Apply pagination
    const offset = (page - 1) * page_size;
    query = query.order("student_no").range(offset, offset + page_size - 1);

    const { data: accountsData, error, count } = await query;

    if (error) {
      console.error("Error fetching accounts:", error);
      return NextResponse.json({ ok: false, error: "加載帳號失敗: " + error.message });
    }

    // Transform data to flatten class_name
    const accounts = (accountsData || []).map((a: any) => ({
      ...a,
      class_name: a.classes?.class_name || null,
    }));

    const totalCount = count || 0;
    const totalPages = Math.ceil(totalCount / page_size);

    return NextResponse.json({ 
      ok: true, 
      accounts, 
      totalCount,
      totalPages,
      page,
      pageSize: page_size
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { student_no, name, email, role } = body;
    if (!student_no || !name) return NextResponse.json({ ok: false, error: "student_no and name required" }, { status: 400 });
    const emailFinal = email && email.trim() !== "" ? email : `${student_no}@cloud.fju.edu.tw`;
    const { data, error } = await supabase.from("accounts").insert([{ student_no, name, email: emailFinal, role: role ?? 'student' }]).select().single();
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, account: data });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
