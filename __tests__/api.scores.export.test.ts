import { describe, it, expect, vi } from 'vitest';
import { GET } from '../app/api/scores/export/route';

vi.mock('@/lib/services/score-query-service', () => ({
  queryScores: async () => [
    {
      class_id: '1',
      class_name: 'C1',
      session_id: '10',
      session_title: 'S1',
      account_id: '100',
      student_no: '414100001',
      name: 'Test',
      raiseCount: 2,
      answerCount: 1,
      totalScore: 5
    }
  ]
}));

vi.mock('@/lib/supabase/client', () => ({ supabaseAdmin: {} }));

vi.mock('@/lib/services/student-score-service', () => ({
  getStudentScoresForSession: async () => [
    {
      account_id: '100',
      student_no: '414100001',
      name: 'Test',
      answerCount: 1,
      raiseCount: 2,
      totalScore: 5
    }
  ]
}));

describe('scores export API', () => {
  it('returns csv by default', async () => {
    const req = new Request('http://localhost/api/scores/export?userId=100');
    const res: any = await GET(req as any);
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain('class_id');
    expect(text).toContain('Test');
  });

  it('returns xlsx when requested', async () => {
    const req = new Request('http://localhost/api/scores/export?userId=100&format=xlsx');
    const res: any = await GET(req as any);
    expect(res.status).toBe(200);
    const contentType = res.headers.get('content-type') || res.headers.get('Content-Type');
    expect(contentType).toContain('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  });
});
