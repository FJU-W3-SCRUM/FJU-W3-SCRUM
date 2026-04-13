import { NextResponse } from "next/server";
import supabase from "@/lib/supabase/client";

export async function GET() {
  try {
    const { data, error } = await supabase.from("groups").select("id,group_name,class_id");
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

    const { data, error } = await supabase.from("groups").insert([{ group_name, class_id }]).select().single();
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, group: data });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
