"use client";
import React, { useState } from "react";

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

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    setResult(null);
    setErrors([]);
    try {
      const res = await fetch("/api/import", { method: "POST", body: text });
      const json = await res.json();
      if (!json.ok) {
        setErrors(json.errors || [{ error: json.error }]);
      } else {
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
      <input type="file" accept=".csv" onChange={handleFile} className="mb-3" />
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

      {result && <div className="mt-3 text-green-600">匯入成功: {JSON.stringify(result)}</div>}

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
