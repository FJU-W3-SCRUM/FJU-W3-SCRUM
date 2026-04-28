"use client";

import { useState } from "react";

export default function TestApiPage() {
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);

  const handleTestApi = async () => {
    setLoading(true);
    setResponse("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ student_no: "joery", password: "1234" }),
      });
      // 我們刻意讀取原始文字，而不是 .json()
      const text = await res.text(); 
      setResponse(text);
    } catch (error: any) {
      setResponse(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif", color: "black", background: "white" }}>
      <h1>API 測試頁面</h1>
      <p>
        這個頁面會直接呼叫 <code>/api/auth/login</code> 端點，並顯示回傳的 <strong>原始文字內容</strong>。
      </p>
      <button onClick={handleTestApi} disabled={loading} style={{ fontSize: '1rem', padding: '0.5rem 1rem' }}>
        {loading ? "測試中..." : "測試登入 API (joery/1234)"}
      </button>
      <hr style={{ margin: "1rem 0" }} />
      <h2>API 回應內容：</h2>
      <pre
        style={{
          background: "#f0f0f0",
          padding: "1rem",
          border: "1px solid #ccc",
          whiteSpace: "pre-wrap",
          wordWrap: "break-word",
        }}
      >
        {response || "尚未測試"}
      </pre>
      <hr style={{ margin: "1rem 0" }} />
      <p style={{marginTop: '2rem', color: 'gray'}}>
        測試完成後，您可以直接刪除專案根目錄下的 <code>app/test-api</code> 資料夾來移除此頁面。
      </p>
    </div>
  );
}
