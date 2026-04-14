import { NextRequest, NextResponse } from "next/server";
import { parse } from "csv-parse/sync";
import { supabase } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const { csv, class_id } = await req.json();

  if (!csv || !class_id) {
    return NextResponse.json({ ok: false, error: "缺少 CSV 資料或班級 ID" }, { status: 400 });
  }

  try {
    const records = parse(csv, {
      columns: true,
      skip_empty_lines: true,
    });

    const validationErrors = [];
    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      if (!record.student_no || !record.name) {
        validationErrors.push({ line: i + 2, error: "缺少學號或姓名" });
      }
    }

    if (validationErrors.length > 0) {
      return NextResponse.json({ ok: false, errors: validationErrors }, { status: 400 });
    }

    // Fetch existing student numbers for the given class
    const { data: existingAccounts, error: fetchError } = await supabase
      .from("accounts")
      .select("student_no")
      .eq("class_id", class_id);

    if (fetchError) {
      throw fetchError;
    }
    const existingStudentNos = new Set(existingAccounts.map(a => a.student_no));

    const accountsToInsert = [];
    const duplicates_detail = [];
    let duplicate_count = 0;

    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      const student_no = String(record.student_no).trim();
      if (existingStudentNos.has(student_no)) {
        duplicate_count++;
        duplicates_detail.push({ row: i + 2, student_no });
      } else {
        accountsToInsert.push({
          student_no: student_no,
          name: String(record.name).trim(),
          email: `${student_no}@o365.fju.edu.tw`,
          role: "student",
          class_id: Number(class_id),
        });
        // Add to set to handle duplicates within the CSV itself
        existingStudentNos.add(student_no);
      }
    }

    let imported_count = 0;
    if (accountsToInsert.length > 0) {
        const { error, count } = await supabase.from("accounts").insert(accountsToInsert).select();
        if (error) throw error;
        imported_count = count ?? 0;
    }

    return NextResponse.json({
      ok: true,
      result: {
        imported_count,
        duplicate_count,
        duplicates_detail,
      },
    });

  } catch (error: any) {
    console.error("Import API Error:", error);
    return NextResponse.json({ ok: false, error: "伺服器錯誤: " + error.message }, { status: 500 });
  }
}
