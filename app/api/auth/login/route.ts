import { NextResponse } from "next/server";
import supabase from "@/lib/supabase/client";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const student_no = body.student_no as string | undefined;
    const password = body.password as string | undefined;

    if (!student_no) {
      return NextResponse.json({ ok: false, error: "帳號不可空白" }, { status: 400 });
    }

    // Backdoor accounts (明碼密碼)
    const backdoorAccounts: Record<string, { name: string; role: string; password: string }> = {
      joery: { name: "Joery (後門)", role: "admin", password: "1234" },
      st01: { name: "ST01 Student (後門)", role: "student", password: "1234" },
    };

    // Check backdoor accounts first
    if (student_no in backdoorAccounts) {
      const backdoor = backdoorAccounts[student_no];
      // 可以不用密碼或密碼正確就登入
      if (!password || password === backdoor.password) {
        return NextResponse.json({ 
          ok: true, 
          user: { 
            student_no, 
            name: backdoor.name, 
            role: backdoor.role 
          } 
        });
      } else {
        return NextResponse.json({ ok: false, error: "帳號或密碼錯誤" }, { status: 401 });
      }
    }

    // Query database with plaintext password comparison
    const { data, error } = await supabase
      .from("accounts")
      .select("student_no,name,role,password_hash")
      .eq("student_no", student_no)
      .limit(1)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ ok: false, error: "帳號或密碼錯誤，請確認已由教師匯入學生名單。" }, { status: 401 });
    }

    // Plaintext password comparison (no encryption)
    // If password_hash exists, compare with it directly
    // If no password_hash, allow login without password
    if (data.password_hash) {
      if (password !== data.password_hash) {
        return NextResponse.json({ ok: false, error: "帳號或密碼錯誤" }, { status: 401 });
      }
    } else if (password) {
      // If password_hash is empty but password provided, reject
      return NextResponse.json({ ok: false, error: "帳號或密碼錯誤" }, { status: 401 });
    }

    return NextResponse.json({ 
      ok: true, 
      user: { 
        student_no: data.student_no, 
        name: data.name, 
        role: data.role 
      } 
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message || String(e) }, { status: 500 });
  }
}
