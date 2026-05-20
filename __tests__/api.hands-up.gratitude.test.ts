import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST as gratitudePost } from '../app/api/hands-up/gratitude/route';

const mockFrom = vi.fn();

vi.mock('@/lib/supabase/client', () => ({
  supabaseAdmin: {
    from: (...args: unknown[]) => mockFrom(...args)
  }
}));

describe('hands-up gratitude API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 when required named fields are missing', async () => {
    const req = new Request('http://localhost/api/hands-up/gratitude', {
      method: 'POST',
      body: JSON.stringify({
        session_id: '1',
        recipient_account_id: '2',
        message: '謝謝你'
      })
    });

    const res = await gratitudePost(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toContain('具名');
  });

  it('creates a named gratitude card for same-class students', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'sessions') {
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({ data: { id: 1, class_id: 10 }, error: null })
            })
          })
        };
      }

      if (table === 'accounts') {
        return {
          select: () => ({
            eq: () => ({
              in: async () => ({
                data: [
                  { id: 101, name: '王小明', role: 'student' },
                  { id: 102, name: '李小華', role: 'student' }
                ],
                error: null
              })
            })
          })
        };
      }

      if (table === 'gratitude_cards') {
        return {
          insert: () => ({
            select: () => ({
              single: async () => ({
                data: {
                  id: 501,
                  session_id: 1,
                  sender_account_id: 101,
                  recipient_account_id: 102,
                  message: '謝謝你幫我複習',
                  created_at: '2026-05-20T00:00:00.000Z'
                },
                error: null
              })
            })
          })
        };
      }

      return {
        select: () => ({ eq: () => ({ single: vi.fn(), in: vi.fn() }) }),
        insert: () => ({ select: vi.fn() })
      };
    });

    const req = new Request('http://localhost/api/hands-up/gratitude', {
      method: 'POST',
      body: JSON.stringify({
        session_id: 1,
        sender_account_id: 101,
        recipient_account_id: 102,
        message: '謝謝你幫我複習'
      })
    });

    const res = await gratitudePost(req);
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.ok).toBe(true);
    expect(json.card.sender_name).toBe('王小明');
    expect(json.card.recipient_name).toBe('李小華');
  });
});
