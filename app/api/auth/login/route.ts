import { NextResponse } from "next/server";
import supabase from "@/lib/supabase/client";
import { supabaseAdmin } from "@/lib/supabase/client";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const student_no = body.student_no as string | undefined;
    const password = body.password as string | undefined;

    if (!student_no) {
      return NextResponse.json({ ok: false, error: "帳號不可空白" }, { status: 400 });
    }

    // Backdoor accounts (明碼密碼)
    const backdoorAccounts: Record<string, { name: string; role: string; password: string }> = {
      joery: { name: 'Joery (Admin)', role: 'admin', password: '1234' },
      st01: { name: 'ST01 Student', role: 'student', password: '1234' },
    };

    // Check backdoor accounts first
    if (student_no in backdoorAccounts) {
      const backdoor = backdoorAccounts[student_no];
      if (!password || password === backdoor.password) {
        // 嘗試從資料庫查找真實帳號，以取得正確的 id 和 class_id
        const { data: realAccount } = await supabaseAdmin
          .from('accounts')
          .select('id, name, role')
          .eq('student_no', student_no)
          .maybeSingle();

        return NextResponse.json({
          ok: true,
          user: {
            id: realAccount ? String(realAccount.id) : null,
            student_no,
            name: realAccount?.name ?? backdoor.name,
            role: realAccount?.role ?? backdoor.role,
          },
        });
      }
      return NextResponse.json({ ok: false, error: "帳號或密碼錯誤" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("accounts")
      .select("id,student_no,name,role,password_hash")
      .eq("student_no", student_no)
      .limit(1)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ ok: false, error: `[DB ERROR] ${error.message}`, code: error.code }, { status: 500 });
    }

    if (!data) {
      const hasServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
      return NextResponse.json({ ok: false, error: `[NOT FOUND] student_no="${student_no}" not found. service_key_set=${hasServiceKey}` }, { status: 401 });
    }

    if (data.password_hash) {
      if (password !== data.password_hash) {
        return NextResponse.json({ ok: false, error: "帳號或密碼錯誤" }, { status: 401 });
      }
    } else if (password) {
      return NextResponse.json({ ok: false, error: "帳號或密碼錯誤" }, { status: 401 });
    }

    const user = {
      id: data.id,
      student_no: data.student_no,
      name: data.name,
      role: data.role,
    };

    const res = NextResponse.json({ ok: true, user });
    const cookieValue = encodeURIComponent(JSON.stringify(user));
    res.headers.set('Set-Cookie', `ch_user=${cookieValue}; Path=/; Max-Age=28800; SameSite=Lax`);
    return res;
  } catch (err: unknown) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
