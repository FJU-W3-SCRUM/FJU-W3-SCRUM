"use client";
import React, { useState, useRef } from "react";

export default function ImportCsvForm() {
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [errors, setErrors] = useState<any[]>([]);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFileName(f.name);
    const reader = new FileReader();
    reader.onload = () => setText(String(reader.result || ""));
    reader.readAsText(f);
  }

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  function triggerFileSelect() {
    fileInputRef.current?.click();
  }

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    setResult(null);
    setErrors([]);
    try {
      // Validate: each non-empty line must have exactly 2 columns (姓名,學號)
      const rawLines = text.split(/\r?\n/);
      const nonEmptyLines = rawLines.filter(Boolean);
      if (nonEmptyLines.length === 0) {
        setErrors([{ error: '匯入內容為空' }]);
        return;
      }

      // If first non-empty line looks like a header (contains 'name' or 'student_no'), keep it.
      const first = nonEmptyLines[0].trim().toLowerCase();
      const hasHeader = first.includes('name') || first.includes('student_no');

      // Validate data rows (skip header if present)
      const dataLines = hasHeader ? nonEmptyLines.slice(1) : nonEmptyLines;
      for (let i = 0; i < dataLines.length; i++) {
        const cols = dataLines[i].split(",");
        if (cols.length !== 2) {
          setErrors([{ error: `第 ${i + 1 + (hasHeader ? 1 : 0)} 行格式錯誤：需為 2 個欄位 (姓名,學號)` }]);
          return;
        }
      }

      // Ensure the server receives a header row with column names it expects.
      let bodyToSend = text;
      if (!hasHeader) {
        // user CSV format is 姓名,學號 -> header should be name,student_no
        bodyToSend = `name,student_no\n${text}`;
      }

      const res = await fetch("/api/import", { method: "POST", body: bodyToSend });
      const json = await res.json();
      if (!json.ok) {
        // Handle validation errors before submission
        setErrors(json.errors || [{ error: json.error }]);
      } else {
        // json.result contains: { imported_count, duplicate_count, duplicates_detail }
        setResult(json.result);
      }
    } catch (err) {
      setErrors([{ error: String(err) }]);
    }
  }

  const preview = text
    .split(/\r?\n/)
    .filter(Boolean)
    .slice(0, 6)
    .map((r) => r.split(","));

  return (
    <div className="bg-white p-4 rounded shadow">
      <h3 className="font-medium mb-3">匯入學生名單 (CSV)</h3>
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        onChange={handleFile}
        className="hidden"
      />
      <div className="flex items-center gap-2 mb-3">
        <button onClick={triggerFileSelect} className="px-3 py-1 bg-gray-200 rounded border">
          選擇檔案
        </button>
        <div className="text-sm text-gray-700">{fileName ?? "尚未選擇檔案"}</div>
      </div>
      <div className="text-sm text-red-600 mb-3">*.csv 內容格式為: 姓名,學號</div>
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={6} className="w-full mb-3 border p-2" placeholder="或貼上 CSV 文字" />
      <div className="mb-3">
        <strong>預覽 ({preview.length} 行)</strong>
        <div className="mt-2 text-sm text-gray-700">
          {preview.map((r, i) => (
            <div key={i} className="py-0.5">{r.join(" | ")}</div>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <button onClick={handleSubmit} className="px-3 py-1 bg-blue-600 text-white rounded">執行匯入</button>
      </div>

      {result && (
        <div className="mt-3 bg-green-50 p-3 rounded border border-green-200">
          <div className="font-medium text-green-700">匯入完成</div>
          <div className="text-sm text-green-600">
            <p>✓ 成功導入: <strong>{result.imported_count || 0}</strong> 筆</p>
            {result.duplicate_count > 0 && (
              <p>⚠ 重複帳號(已略過): <strong>{result.duplicate_count}</strong> 筆</p>
            )}
            {result.duplicates_detail && result.duplicates_detail.length > 0 && (
              <details className="mt-2">
                <summary className="cursor-pointer">查看重複學號</summary>
                <ul className="mt-2 ml-4 text-xs">
                  {result.duplicates_detail.map((dup: any, idx: number) => (
                    <li key={idx}>第 {dup.row} 行: {dup.student_no}</li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        </div>
      )}

      {errors.length > 0 && (
        <div className="mt-3 bg-red-50 p-3 rounded">
          <div className="font-medium text-red-700">匯入失敗</div>
          <ul className="text-sm text-red-600">
            {errors.map((er, idx) => (
              <li key={idx}>{er.line ? `第 ${er.line} 行: ${er.error}` : er.error}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
