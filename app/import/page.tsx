"use client";
import { useState } from 'react';

export default function ImportPage() {
  const [fileText, setFileText] = useState('');
  const [result, setResult] = useState<any>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const txt = await f.text();
    setFileText(txt);
  }

  async function submit() {
    const res = await fetch('/api/import', { method: 'POST', body: fileText });
    const j = await res.json();
    setResult(j);
  }

  return (
    <div style={{ padding: 20 }}>
      <h2>CSV Student Import (preview/validate)</h2>
      <input type="file" accept=".csv" onChange={handleFile} />
      <div style={{ marginTop: 12 }}>
        <button onClick={submit} disabled={!fileText}>Validate & Preview</button>
      </div>
      <pre style={{ marginTop: 12 }}>{JSON.stringify(result, null, 2)}</pre>
    </div>
  );
}
