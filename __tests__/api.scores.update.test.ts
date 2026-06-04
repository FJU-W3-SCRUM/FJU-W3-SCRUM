import { describe, it, expect, vi } from 'vitest';
import { POST } from '../app/api/scores/update/route';

const mockUpsert = vi.fn(async () => ({ data: [{ id: 1 }], error: null }));
const mockInsert = vi.fn(async () => ({ data: [{ id: 11 }], error: null }));

vi.mock('@/lib/supabase/client', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table === 'session_scores') {
        return { upsert: () => ({ select: mockUpsert }) };
      }
      if (table === 'operation_logs') {
        return { insert: mockInsert };
      }
      return {};
    }
  }
}));

describe('scores update API', () => {
  it('upserts session_scores and logs operation', async () => {
    const payload = { sessionId: 10, accountId: 100, adjustedPoint: 7, modifiedBy: 2 };
    const req = new Request('http://localhost/api/scores/update', { method: 'POST', body: JSON.stringify(payload) });
    const res: any = await POST(req as any);
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(mockUpsert).toHaveBeenCalled();
    expect(mockInsert).toHaveBeenCalled();
  });
});
