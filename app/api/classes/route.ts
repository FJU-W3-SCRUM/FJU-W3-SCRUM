import { NextResponse } from "next/server";
import supabase from "@/lib/supabase/client";

export async function GET() {
  try {
    const { data, error } = await supabase.from("classes").select("id,class_name,year,teacher_id,created_at");
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, classes: data });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { class_name, year, teacher_id } = body;
    if (!class_name) return NextResponse.json({ ok: false, error: "class_name required" }, { status: 400 });
    // check duplicate by class_name
    const { data: exists, error: selErr } = await supabase.from("classes").select("id").eq("class_name", class_name).limit(1).maybeSingle();
    if (selErr) return NextResponse.json({ ok: false, error: selErr.message }, { status: 500 });
    if (exists) {
      return NextResponse.json({ ok: false, error: "Class name already exists" }, { status: 409 });
    }

    const { data, error } = await supabase.from("classes").insert([{ class_name, year, teacher_id }]).select().single();
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, class: data });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const id = body.id;
    if (!id) return NextResponse.json({ ok: false, error: "id required" }, { status: 400 });
    const { data, error } = await supabase.from("classes").delete().eq("id", id).select().single();
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, deleted: data });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
