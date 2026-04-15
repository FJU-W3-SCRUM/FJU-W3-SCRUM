import { NextResponse } from "next/server";
import supabase from "@/lib/supabase/client";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const class_id = url.searchParams.get("class_id");
    const q = url.searchParams.get("q");
    const page = parseInt(url.searchParams.get("page") || "1", 10);
    const page_size = parseInt(url.searchParams.get("page_size") || "10", 10);

    // Build query
    let query = supabase
      .from("accounts")
      .select("id,student_no,name,email,role,class_id", { count: "exact" });

    if (class_id) {
      query = query.eq("class_id", class_id);
    }

    if (q) {
      query = query.or(`student_no.ilike.%${q}%,name.ilike.%${q}%`);
    }

    // Apply ordering (by class_id, then student_no) and pagination
    const offset = (page - 1) * page_size;
    query = query
      .order("class_id", { ascending: true, nullsFirst: false })
      .order("student_no", { ascending: true })
      .range(offset, offset + page_size - 1);

    const { data: accountsData, error, count } = await query;

    if (error) {
      console.error("Error fetching accounts:", error);
      return NextResponse.json({ ok: false, error: "加載帳號失敗: " + error.message });
    }

    // Fetch all classes for lookup
    const { data: classesData, error: classError } = await supabase
      .from("classes")
      .select("id,class_name");

    if (classError) {
      console.error("Error fetching classes:", classError);
    }

    // Create a map for fast lookup
    const classMap = new Map();
    (classesData || []).forEach((c: any) => {
      classMap.set(c.id, c.class_name);
    });

    // Transform data - manually join with class_name
    const accounts = (accountsData || []).map((a: any) => ({
      id: a.id,
      student_no: a.student_no,
      name: a.name,
      email: a.email,
      role: a.role,
      class_id: a.class_id,
      class_name: a.class_id ? classMap.get(a.class_id) || null : null,
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
    console.error("GET /api/accounts error:", e);
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
