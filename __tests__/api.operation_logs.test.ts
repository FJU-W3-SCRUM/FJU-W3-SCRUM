import { describe, it, expect, vi } from 'vitest';
import { GET } from '../app/api/operation-logs/route';

vi.mock('@/lib/supabase/client', () => ({
  supabaseAdmin: {
    from: () => ({
      select: () => ({
        order: () => {
          const resp = {
            then: (cb: any) => cb({ data: [
              { id: 1, account_id: 'u1', action_type: 'update', resource_type: 'session', resource_id: '10', payload: { changed: true }, created_at: '2026-05-01T00:00:00Z' }
            ], error: null }),
            eq: () => ({
              then: (cb: any) => cb({ data: [
                { id: 1, account_id: 'u1', action_type: 'update', resource_type: 'session', resource_id: '10', payload: { changed: true }, created_at: '2026-05-01T00:00:00Z' }
              ], error: null })
            })
          };
          return resp;
        }
      })
    })
  }
}));

describe('operation-logs API', () => {
  it('returns operation logs', async () => {
    const req = new Request('http://localhost/api/operation-logs');
    const res: any = await GET(req as any);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(Array.isArray(json.data)).toBe(true);
    expect(json.data[0].action_type).toBe('update');
  });
});
