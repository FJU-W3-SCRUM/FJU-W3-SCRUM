import { NextResponse } from "next/server";
import supabase from "@/lib/supabase/client";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const class_id = url.searchParams.get("class_id");
    const q = url.searchParams.get("q");

    let query = supabase.from("accounts").select("id,student_no,name,email,role,status,created_at");
    
    // If filtering by class, join with class_members
    if (class_id) {
      query = supabase.from("class_members")
        .select("account_id:id, accounts:accounts(id,student_no,name,email,role,status,created_at)")
        .eq("class_id", Number(class_id));
      
      const { data, error } = await query;
      if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
      
      // Flatten the nested structure
      const flattened = (data ?? []).map((item: any) => item.accounts).filter(Boolean);
      
      // Apply search filter if provided
      let filtered = flattened;
      if (q) {
        const lowerQ = q.toLowerCase();
        filtered = flattened.filter((acc: any) =>
          acc.student_no.toLowerCase().includes(lowerQ) || acc.name.toLowerCase().includes(lowerQ)
        );
      }
      
      return NextResponse.json({ ok: true, accounts: filtered });
    }
    
    // If no class_id, get all accounts
    if (q) query = query.ilike("name", `%${q}%`).or(`student_no.ilike.%${q}%`);

    const { data, error } = await query;
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, accounts: data });
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
