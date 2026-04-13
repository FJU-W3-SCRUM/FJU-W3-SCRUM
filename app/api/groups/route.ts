import { NextResponse } from "next/server";
import supabase from "@/lib/supabase/client";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const class_id = url.searchParams.get("class_id");
    let query = supabase.from("groups").select("id,group_name,class_id");
    if (class_id) query = query.eq("class_id", Number(class_id));
    const { data, error } = await query.order('group_name', { ascending: true });
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, groups: data });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const group_name = body.group_name as string | undefined;
    const class_id = body.class_id as number | undefined;
    if (!group_name) return NextResponse.json({ ok: false, error: "group_name required" }, { status: 400 });

    // check duplicate by group_name within same class
    const query = supabase.from("groups").select("id").eq("group_name", group_name);
    if (class_id) query.eq("class_id", class_id);
    const { data: exists, error: selErr } = await query.limit(1).maybeSingle();
    if (selErr) return NextResponse.json({ ok: false, error: selErr.message }, { status: 500 });
    if (exists) return NextResponse.json({ ok: false, error: "Group name already exists" }, { status: 409 });

    const { data, error } = await supabase.from("groups").insert([{ group_name, class_id }]).select().single();
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, group: data });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
