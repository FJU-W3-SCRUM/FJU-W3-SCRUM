import { describe, it, expect, vi } from 'vitest';
import { GET } from '../app/api/students/history/route';

vi.mock('@/lib/services/student-history-service', () => ({
  getStudentHistory: async () => ({
    totalRaise: 3,
    totalAnswer: 2,
    totalScore: 7,
    sessions: [
      {
        session_id: 167,
        session_title: '課堂互動 - 2026/5/21',
        session_created_at: '2026-05-20T16:50:45.371611Z',
        raise_count: 3,
        answer_count: 2,
        score: 7,
        ratings: [
          { id: 1, star: 5, rater_account_id: 10, rater_name: 'Teacher A', rater_role: 'teacher', source: 'teacher', created_at: '2026-05-20T16:51:00Z' }
        ]
      }
    ]
  })
}));

vi.mock('@/lib/supabase/client', () => ({ supabaseAdmin: {} }));

describe('students history API', () => {
  it('returns student history with ratings', async () => {
    const req = new Request('http://localhost/api/students/history?accountId=100');
    const res: any = await GET(req as any);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.data.totalScore).toBe(7);
    expect(Array.isArray(json.data.sessions)).toBe(true);
    expect(json.data.sessions[0].ratings[0].rater_role).toBe('teacher');
  });
});
