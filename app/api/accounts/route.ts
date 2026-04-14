import { NextResponse } from "next/server";
import supabase from "@/lib/supabase/client";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const class_id = url.searchParams.get("class_id");
    const q = url.searchParams.get("q");

    let query = supabase.from("accounts").select();

    if (class_id) {
      query = query.eq("class_id", class_id);
    }

    if (q) {
      query = query.or(`student_no.ilike.%${q}%,name.ilike.%${q}%`);
    }

    const { data: accounts, error } = await query.order("student_no");

    if (error) {
      console.error("Error fetching accounts:", error);
      return NextResponse.json({ ok: false, error: "加載帳號失敗: " + error.message });
    }

    return NextResponse.json({ ok: true, accounts: accounts });
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
