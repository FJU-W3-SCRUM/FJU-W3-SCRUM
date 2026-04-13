import { NextResponse } from 'next/server';
import supabase from '@/lib/supabase/client';

export async function POST(request: Request) {
  const text = await request.text();
  if (!text || text.trim() === '') {
    return NextResponse.json({ ok: false, error: 'Empty body' }, { status: 400 });
  }

  const lines = text.split(/\r?\n/).filter(Boolean);
  const header = lines.shift();
  if (!header) return NextResponse.json({ ok: false, error: 'Missing header row' }, { status: 400 });

  const cols = header.split(',').map(c => c.trim());
  const required = ['student_no', 'name'];
  for (const r of required) if (!cols.includes(r)) {
    return NextResponse.json({ ok: false, error: `Missing required column: ${r}` }, { status: 400 });
  }

  const results: Array<{line:number, ok:boolean, error?:string, row?:Record<string,string>}> = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const values = line.split(',').map(v => v.trim());
    if (values.length < cols.length) {
      results.push({ line: i+2, ok: false, error: 'Column count mismatch' });
      continue;
    }
    const row: Record<string,string> = {};
    cols.forEach((c, idx) => row[c] = values[idx] ?? '');
    if (!row['student_no'] || !row['name']) {
      results.push({ line: i+2, ok: false, error: 'Missing student_no or name', row });
      continue;
    }
    results.push({ line: i+2, ok: true, row });
  }

  const errors = results.filter(r => !r.ok);
  if (errors.length > 0) {
    return NextResponse.json({ ok: false, errors }, { status: 422 });
  }

  // Build JSON array for RPC
  const rows = results.map(r => r.row);

  try {
    // call Postgres stored procedure to import atomically
    const { data, error } = await supabase.rpc('import_accounts', { rows: rows, uploaded_by: null });
    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, result: data });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message || String(e) }, { status: 500 });
  }
}
