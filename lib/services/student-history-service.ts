import { SupabaseClient } from '@supabase/supabase-js';

export interface RatingDetail {
  id: number;
  star: number;
  rater_account_id: number | null;
  rater_role?: string;
  rater_name?: string;
  source?: string;
  created_at?: string;
}

export interface SessionHistoryRow {
  session_id: number;
  session_title: string;
  session_created_at?: string;
  raise_count: number;
  answer_count: number;
  score: number;
  ratings?: RatingDetail[];
}

/**
 * 取得單一學生的歷史紀錄（每次 session 的統計 + 評分明細）
 */
export async function getStudentHistory(
  supabase: SupabaseClient,
  accountId: string
): Promise<{ totalRaise: number; totalAnswer: number; totalScore: number; sessions: SessionHistoryRow[] }> {
  try {
    // 1) 取得 hand_raises 聚合（按 session）
    const { data: raises, error: raisesError } = await supabase
      .from('hand_raises')
      .select('session_id, status')
      .eq('account_id', accountId);

    if (raisesError) throw raisesError;

    const raisesBySession = new Map<number, { raise_count: number; answer_count: number }>();
    (raises || []).forEach((r: any) => {
      const sid = r.session_id as number;
      if (!raisesBySession.has(sid)) raisesBySession.set(sid, { raise_count: 0, answer_count: 0 });
      const cur = raisesBySession.get(sid)!;
      cur.raise_count += 1;
      if (r.status === 'A') cur.answer_count += 1;
    });

    // 2) 取得 answers->ratings 聚合與明細
    const { data: answersWithRatings, error: answersErr } = await supabase
      .from('answers')
      .select('id, session_id, ratings(id, star, rater_account_id, source, created_at, accounts(id, name, role))')
      .eq('account_id', accountId);

    if (answersErr) throw answersErr;

    const scoreBySession = new Map<number, { score: number; ratings: RatingDetail[] }>();
    (answersWithRatings || []).forEach((ans: any) => {
      const sid = ans.session_id as number;
      const ratings = ans.ratings || [];
      if (!scoreBySession.has(sid)) scoreBySession.set(sid, { score: 0, ratings: [] });
      const cur = scoreBySession.get(sid)!;
      ratings.forEach((rt: any) => {
        cur.score += rt.star || 0;
        cur.ratings.push({
          id: rt.id,
          star: rt.star || 0,
          rater_account_id: rt.rater_account_id,
          rater_name: rt.accounts?.name,
          rater_role: rt.accounts?.role,
          source: rt.source,
          created_at: rt.created_at
        });
      });
    });

    // 3) 建立 session list 與查詢 session 詳細
    const sessionIds = new Set<number>([...raisesBySession.keys(), ...scoreBySession.keys()]);

    const sessions: SessionHistoryRow[] = [];
    for (const sid of sessionIds) {
      const { data: sessData, error: sessErr } = await supabase
        .from('sessions')
        .select('id, title, created_at, classes(id, class_name)')
        .eq('id', sid)
        .maybeSingle();

      if (sessErr) throw sessErr;

      const raiseObj = raisesBySession.get(sid) || { raise_count: 0, answer_count: 0 };
      const scoreObj = scoreBySession.get(sid) || { score: 0, ratings: [] };

      sessions.push({
        session_id: sid,
        session_title: sessData?.title || '',
        session_created_at: sessData?.created_at,
        raise_count: raiseObj.raise_count,
        answer_count: raiseObj.answer_count,
        score: scoreObj.score,
        ratings: scoreObj.ratings
      });
    }

    // totals
    const totalRaise = Array.from(raisesBySession.values()).reduce((s, v) => s + v.raise_count, 0);
    const totalAnswer = Array.from(raisesBySession.values()).reduce((s, v) => s + v.answer_count, 0);
    const totalScore = Array.from(scoreBySession.values()).reduce((s, v) => s + v.score, 0);

    // sort sessions by created_at desc
    sessions.sort((a, b) => (b.session_created_at || '').localeCompare(a.session_created_at || ''));

    return { totalRaise, totalAnswer, totalScore, sessions };
  } catch (error) {
    console.error('getStudentHistory error:', error);
    throw error;
  }
}
