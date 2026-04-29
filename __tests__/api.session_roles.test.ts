import { describe, it, expect, vi } from "vitest";
import { POST as rolesPost } from "../app/api/session_roles/route";

vi.mock("@/lib/supabase/client", () => ({
  __esModule: true,
  default: {
    from: () => ({
      insert: () => ({
        select: () => ({
          single: async () => ({
            data: { id: 1, session_id: 1, account_id: 's001', role: 'group_leader' },
            error: null
          })
        })
      })
    })
  }
}));

describe("session_roles API", () => {
  it("POST assigns a role (mocked)", async () => {
    const payload = { session_id: 1, account_id: 's001', role: 'group_leader' };
    console.debug("[測試] 指派角色 payload:", payload);
    const req = new Request("http://localhost/api/session_roles", { method: "POST", body: JSON.stringify(payload) });
    const res = await rolesPost(req as any);
    console.debug("[測試] 指派角色 response 狀態:", res.status);
    const json = await res.json();
    console.debug("[測試] 指派角色 response 內容:", json);
    expect(json.ok).toBe(true);
    expect(json.role).toBeDefined();
  });
});
