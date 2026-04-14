import { NextResponse } from "next/server";
import supabase from "@/lib/supabase/client";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const class_id = url.searchParams.get("class_id");
    const group_id = url.searchParams.get("group_id");

    if (!class_id || !group_id) {
      return NextResponse.json(
        { ok: false, error: "class_id and group_id required" },
        { status: 400 }
      );
    }

    // Query 1: Get all students in the class (from accounts which has class_id field)
    const { data: allClassStudents, error: classError } = await supabase
      .from("accounts")
      .select("student_no, name")
      .eq("class_id", Number(class_id));

    if (classError) {
      console.error("classError:", classError);
      return NextResponse.json({ ok: false, error: classError.message }, { status: 500 });
    }

    if (!allClassStudents || allClassStudents.length === 0) {
      return NextResponse.json({ ok: true, students: [] });
    }

    // Query 2: Get all students already in this group
    const { data: groupMembers, error: groupError } = await supabase
      .from("group_members")
      .select("student_no")
      .eq("group_id", Number(group_id));

    if (groupError) {
      console.error("groupError:", groupError);
      return NextResponse.json({ ok: false, error: groupError.message }, { status: 500 });
    }

    const groupedStudentNos = new Set(
      (groupMembers || []).map((gm: any) => gm.student_no)
    );

    // Filter students NOT in group (NOT EXISTS logic)
    const ungroupedStudents = allClassStudents.filter(
      (student: any) => !groupedStudentNos.has(student.student_no)
    );

    console.log(`Class ${class_id}, Group ${group_id}: Total=${allClassStudents.length}, Grouped=${groupedStudentNos.size}, Ungrouped=${ungroupedStudents.length}`);

    return NextResponse.json({ ok: true, students: ungroupedStudents });
  } catch (e: any) {
    console.error("Error:", e);
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
