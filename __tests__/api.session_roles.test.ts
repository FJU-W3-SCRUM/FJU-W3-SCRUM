import { describe, it, expect, vi } from "vitest";
import { POST as rolesPost } from "../app/api/session_roles/route";

vi.mock("@/lib/supabase/client", () => ({
  default: {
    from: (table: string) => ({
      insert: () => ({
        select: () => ({
          single: async () => ({
            data: { id: 1, session_id: 1, account_id: "s001", role: "group_leader" },
            error: null,
          }),
        }),
      }),
    }),
  },
}));

describe("session_roles API", () => {
  it("POST assigns a role (mocked)", async () => {
    const req = new Request("http://localhost/api/session_roles", { method: "POST", body: JSON.stringify({ session_id: 1, account_id: 's001', role: 'group_leader' }) });
    const res = await rolesPost(req as any);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.role).toBeDefined();
  });
});
