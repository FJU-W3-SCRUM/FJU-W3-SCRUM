import { NextResponse } from "next/server";
import supabase from "@/lib/supabase/client";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const group_id = url.searchParams.get("group_id");
    if (!group_id) return NextResponse.json({ ok: false, error: "group_id required" }, { status: 400 });
    
    // Get group members
    const { data: groupMembers, error: memberError } = await supabase
      .from("group_members")
      .select("id,student_no,is_leader,created_at")
      .eq("group_id", Number(group_id));
    
    if (memberError) return NextResponse.json({ ok: false, error: memberError.message }, { status: 500 });
    
    if (!groupMembers || groupMembers.length === 0) {
      return NextResponse.json({ ok: true, members: [] });
    }
    
    // Get all relevant student info by student_no values
    const studentNos = (groupMembers || []).map((m: any) => m.student_no);
    const { data: accounts, error: accountError } = await supabase
      .from("accounts")
      .select("student_no,name")
      .in("student_no", studentNos);
    
    if (accountError) return NextResponse.json({ ok: false, error: accountError.message }, { status: 500 });
    
    // Create lookup map for fast access
    const accountMap = new Map((accounts || []).map((a: any) => [a.student_no, a.name]));
    
    // Join on client side
    const members = (groupMembers || []).map((m: any) => ({
      id: m.id,
      student_no: m.student_no,
      name: accountMap.get(m.student_no) || '',
      is_leader: m.is_leader,
      created_at: m.created_at
    }));
    
    return NextResponse.json({ ok: true, members });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { group_id, student_no, is_leader } = body;
    if (!group_id || !student_no) return NextResponse.json({ ok: false, error: "group_id and student_no required" }, { status: 400 });
    const { data, error } = await supabase.from("group_members").insert([{ group_id, student_no, is_leader: !!is_leader }]).select().single();
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, member: data });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const id = body.id;
    if (!id) return NextResponse.json({ ok: false, error: "id required" }, { status: 400 });
    const { data, error } = await supabase.from("group_members").delete().eq("id", id).select().single();
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, deleted: data });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, is_leader } = body;
    if (!id) return NextResponse.json({ ok: false, error: "id required" }, { status: 400 });
    const { data, error } = await supabase.from("group_members").update({ is_leader }).eq("id", id).select().single();
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, member: data });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
