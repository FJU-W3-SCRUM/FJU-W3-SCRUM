import { NextResponse } from "next/server";
import { parse } from "csv-parse/sync";
import supabase from "@/lib/supabase/client";
import type {
  ImportCsvRow,
  ImportValidationError,
  DuplicateDetail,
  AccountInsert,
  ExistingAccountRow,
} from "@/types/account";

export async function POST(req: Request) {
  const { csv, class_id } = await req.json();

  if (!csv || !class_id) {
    return NextResponse.json(
      { ok: false, error: "缺少 CSV 資料或班級 ID" },
      { status: 400 },
    );
  }

  try {
    const numericClassId = Number(class_id);

    if (Number.isNaN(numericClassId)) {
      return NextResponse.json(
        { ok: false, error: "class_id 格式錯誤" },
        { status: 400 },
      );
    }

    // 先把 CSV parse 成可處理的原始資料
    const rawRecords = parse(csv, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    }) as Record<string, unknown>[];

    // 正規化成明確型別
    const records: ImportCsvRow[] = rawRecords.map((record) => ({
      student_no: String(record.student_no ?? "").trim(),
      name: String(record.name ?? "").trim(),
    }));

    const validationErrors: ImportValidationError[] = [];

    for (let i = 0; i < records.length; i++) {
      const record = records[i];

      if (!record.student_no || !record.name) {
        validationErrors.push({
          line: i + 2, // 第 1 列是 header，資料從第 2 列開始
          error: "缺少學號或姓名",
        });
      }
    }

    if (validationErrors.length > 0) {
      return NextResponse.json(
        { ok: false, errors: validationErrors },
        { status: 400 },
      );
    }

    // 取得該班已存在的學號
    const { data: existingAccounts, error: fetchError } = await supabase
      .from("accounts")
      .select("student_no")
      .eq("class_id", numericClassId);

    if (fetchError) throw fetchError;

    const existingStudentNos = new Set(
      ((existingAccounts ?? []) as ExistingAccountRow[]).map((account) =>
        String(account.student_no).trim(),
      ),
    );

    const accountsToInsert: AccountInsert[] = [];
    const duplicates_detail: DuplicateDetail[] = [];
    let duplicate_count = 0;

    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      const student_no = record.student_no;
      const name = record.name;

      if (existingStudentNos.has(student_no)) {
        duplicate_count++;
        duplicates_detail.push({
          row: i + 2, // 對應實際 CSV 列號
          student_no,
        });
      } else {
        accountsToInsert.push({
          student_no,
          name,
          email: `${student_no}@cloud.fju.edu.tw`,
          password_hash: student_no,
          role: "student",
          status: "active",
          class_id: numericClassId,
        });

        // 防止 CSV 內自己重複
        existingStudentNos.add(student_no);
      }
    }

    if (accountsToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from("accounts")
        .insert(accountsToInsert);

      if (insertError) throw insertError;
    }

    return NextResponse.json({
      ok: true,
      result: {
        imported_count: accountsToInsert.length,
        duplicate_count,
        duplicates_detail,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "未知錯誤";

    console.error("Import API Error:", error);

    return NextResponse.json(
      { ok: false, error: "伺服器錯誤: " + message },
      { status: 500 },
    );
  }
}
