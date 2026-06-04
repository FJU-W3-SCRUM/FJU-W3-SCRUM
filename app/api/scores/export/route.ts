import { NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase/client';
import { queryScores, type ScoreQueryFilters } from '@/lib/services/score-query-service';
import ExcelJS from 'exceljs';
import { getStudentScoresForSession } from '@/lib/services/student-score-service';
import { PassThrough } from 'stream';

function toCsv(rows: any[], headers: string[]) {
  const esc = (v: any) => {
    if (v === null || v === undefined) return '';
    const s = String(v);
    if (s.includes(',') || s.includes('\n') || s.includes('"')) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  };

  const headerLine = headers.join(',');
  const lines = rows.map((r) => headers.map((h) => esc(r[h] ?? r[h.toLowerCase()] ?? '')).join(','));
  return [headerLine, ...lines].join('\n');
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId') || request.headers.get('x-user-id');
    const userRole = (url.searchParams.get('userRole') || request.headers.get('x-user-role') || 'student') as 'admin' | 'student';

    if (!userId) {
      return NextResponse.json({ ok: false, error: 'userId is required' }, { status: 400 });
    }

    const filters: ScoreQueryFilters = {};
    const classId = url.searchParams.get('classId');
    const keyword = url.searchParams.get('keyword');
    const format = (url.searchParams.get('format') || 'csv').toLowerCase();

    if (classId) filters.classId = classId;
    if (keyword) filters.keyword = keyword;

    const results = await queryScores(supabase, userId, userRole, filters);

    const headers = [
      'class_id',
      'class_name',
      'session_id',
      'session_title',
      'account_id',
      'student_no',
      'name',
      'raiseCount',
      'answerCount',
      'totalScore'
    ];

    const includeRatings = url.searchParams.get('includeRatings') === 'true';
    const ratingHeaders = ['rating_id','rating_star','rater_account_id','rater_name','rater_role','rating_source','rating_created_at'];
    const csvHeaders = includeRatings ? [...headers, ...ratingHeaders] : headers;

    if (format === 'csv') {
      // when includeRatings, expand rows per rating; otherwise simple rows
      const rows: any[] = [];
      if (!includeRatings) {
        results.forEach((row: any) => {
          const r: any = {};
          headers.forEach((h) => { r[h] = row[h] ?? row[h.toLowerCase()] ?? ''; });
          rows.push(r);
        });
      } else {
        // query ratings per result row
        for (const row of results as any[]) {
          const base: any = {};
          headers.forEach((h) => { base[h] = (row as any)[h] ?? (row as any)[h.toLowerCase()] ?? ''; });
          const { data: answers } = await supabase
            .from('answers')
            .select('id')
            .eq('session_id', row.session_id)
            .eq('account_id', row.account_id);
          const answerIds = (answers || []).map((a: any) => a.id);
          if (answerIds.length === 0) {
            rows.push({ ...base });
            continue;
          }
          const { data: ratings } = await supabase
            .from('ratings')
            .select('id, star, rater_account_id, source, created_at, accounts(id, name, role)')
            .in('answer_id', answerIds);
          if (!ratings || ratings.length === 0) {
            rows.push({ ...base });
            continue;
          }
          for (const rt of ratings) {
            const rrow = { ...base } as any;
            rrow.rating_id = rt.id;
            rrow.rating_star = rt.star;
            rrow.rater_account_id = rt.rater_account_id;
            rrow.rater_name = rt.accounts?.[0]?.name;
            rrow.rater_role = rt.accounts?.[0]?.role;
            rrow.rating_source = rt.source;
            rrow.rating_created_at = rt.created_at;
            rows.push(rrow);
          }
        }
      }

      const csv = toCsv(rows, csvHeaders);
      const filename = `scores_${new Date().toISOString().slice(0,10)}.csv`;
      return new Response(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`
        }
      });
    }

    if (format === 'xlsx') {
      // If paged=true, stream workbook and fetch per-session data to avoid high memory usage
      const paged = url.searchParams.get('paged') === 'true';
      const pageSize = parseInt(url.searchParams.get('pageSize') || '1000', 10);

      if (!paged) {
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Scores');

        const allHeaders = includeRatings ? [...headers, ...ratingHeaders] : headers;
        sheet.columns = allHeaders.map((h) => ({ header: h, key: h, width: 20 }));

        if (!includeRatings) {
          results.forEach((row: any) => {
            const r: any = {};
            headers.forEach((h) => { r[h] = row[h] ?? row[h.toLowerCase()] ?? ''; });
            sheet.addRow(r);
          });
        } else {
          for (const row of results as any[]) {
            const base: any = {};
            headers.forEach((h) => { base[h] = (row as any)[h] ?? (row as any)[h.toLowerCase()] ?? ''; });
            const { data: answers } = await supabase
              .from('answers')
              .select('id')
              .eq('session_id', row.session_id)
              .eq('account_id', row.account_id);
            const answerIds = (answers || []).map((a: any) => a.id);
            if (answerIds.length === 0) {
              sheet.addRow(base);
              continue;
            }
            const { data: ratings } = await supabase
              .from('ratings')
              .select('id, star, rater_account_id, source, created_at, accounts(id, name, role)')
              .in('answer_id', answerIds);
            if (!ratings || ratings.length === 0) {
              sheet.addRow(base);
              continue;
            }
            for (const rt of ratings) {
              const rrow = { ...base } as any;
              rrow.rating_id = rt.id;
              rrow.rating_star = rt.star;
              rrow.rater_account_id = rt.rater_account_id;
              rrow.rater_name = rt.accounts?.[0]?.name;
              rrow.rater_role = rt.accounts?.[0]?.role;
              rrow.rating_source = rt.source;
              rrow.rating_created_at = rt.created_at;
              sheet.addRow(rrow);
            }
          }
        }

        const buffer = await workbook.xlsx.writeBuffer();
        const filename = `scores_${new Date().toISOString().slice(0,10)}.xlsx`;

        return new Response(buffer, {
          status: 200,
          headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename="${filename}"`
          }
        });
      }

      // Streaming path: fetch sessions, then for each session fetch student stats and write rows
      const sessionsResp = await supabase
        .from('sessions')
        .select('id, title, class_id, classes(id, class_name)')
        .order('id', { ascending: true });

      const sessions = (sessionsResp.data as any[]) || [];

      const passThrough = new PassThrough();
      const workbookWriter = new ExcelJS.stream.xlsx.WorkbookWriter({ stream: passThrough, useSharedStrings: true });
      const sheet = workbookWriter.addWorksheet('Scores');
      sheet.columns = headers.map((h) => ({ header: h, key: h, width: 20 }));

      (async () => {
        try {
          for (const session of sessions) {
            const sessionId = session.id;
            // Fetch per-session student stats (stream-friendly)
            const studentScores = await getStudentScoresForSession(supabase, String(sessionId));
                for (const s of studentScores) {
                  const baseRow: any = {
                    class_id: (s as any)['class_id'] ?? session.class_id ?? '',
                    class_name: session.classes?.[0]?.class_name ?? '',
                    session_id: sessionId,
                    session_title: session.title || '',
                    account_id: s.account_id,
                    student_no: s.student_no,
                    name: s.name,
                    raiseCount: s.raiseCount,
                    answerCount: s.answerCount,
                    totalScore: s.totalScore
                  };
                  if (!includeRatings) {
                    sheet.addRow(baseRow).commit();
                  } else {
                    // fetch answers for this student in this session
                    const { data: answers } = await supabase
                      .from('answers')
                      .select('id')
                      .eq('session_id', sessionId)
                      .eq('account_id', s.account_id);
                    const answerIds = (answers || []).map((a: any) => a.id);
                    if (answerIds.length === 0) {
                      sheet.addRow(baseRow).commit();
                    } else {
                      const { data: ratings } = await supabase
                        .from('ratings')
                        .select('id, star, rater_account_id, source, created_at, accounts(id, name, role)')
                        .in('answer_id', answerIds);
                      if (!ratings || ratings.length === 0) {
                        sheet.addRow(baseRow).commit();
                      } else {
                        for (const rt of ratings) {
                          const rrow = { ...baseRow } as any;
                          rrow.rating_id = rt.id;
                          rrow.rating_star = rt.star;
                          rrow.rater_account_id = rt.rater_account_id;
                          rrow.rater_name = rt.accounts?.[0]?.name;
                          rrow.rater_role = rt.accounts?.[0]?.role;
                          rrow.rating_source = rt.source;
                          rrow.rating_created_at = rt.created_at;
                          sheet.addRow(rrow).commit();
                        }
                      }
                    }
                  }
                }
          }

          await workbookWriter.commit();
          passThrough.end();
        } catch (e) {
          console.error('Streaming xlsx error:', e);
          passThrough.destroy(e as any);
        }
      })();

      const filename = `scores_${new Date().toISOString().slice(0,10)}.xlsx`;
      return new Response(passThrough as any, {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${filename}"`
        }
      });
    }

    return NextResponse.json({ ok: false, error: 'unsupported format' }, { status: 400 });
  } catch (error: any) {
    console.error('GET /api/scores/export error:', error);
    return NextResponse.json({ ok: false, error: error.message || 'Internal server error' }, { status: 500 });
  }
}
