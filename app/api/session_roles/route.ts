import { NextResponse } from "next/server";
import supabase from "@/lib/supabase/client";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const session_id = url.searchParams.get("session_id");
    if (!session_id) return NextResponse.json({ ok: false, error: "session_id required" }, { status: 400 });
    const { data, error } = await supabase.from("session_roles").select("id,session_id,account_id,role,assigned_by,assigned_at").eq("session_id", Number(session_id));
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, roles: data });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { session_id, account_id, role, assigned_by } = body;
    if (!session_id || !account_id || !role) return NextResponse.json({ ok: false, error: "session_id, account_id and role required" }, { status: 400 });
    const payload = { session_id, account_id, role, assigned_by: assigned_by ?? null, assigned_at: new Date().toISOString() };
    const { data, error } = await supabase.from("session_roles").insert([payload]).select().single();
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, role: data });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const id = body.id;
    if (!id) return NextResponse.json({ ok: false, error: "id required" }, { status: 400 });
    const { data, error } = await supabase.from("session_roles").delete().eq("id", id).select().single();
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, deleted: data });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
