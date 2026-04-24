import { describe, it, expect, vi } from "vitest";
import { POST as membersPost, DELETE as membersDelete } from "../app/api/group_members/route";

// Mock supabase client to simulate insert and delete behavior
vi.mock("@/lib/supabase/client", () => ({
  default: {
    from: (table: string) => {
      if (table === "group_members") {
        return {
          // match chain: insert().select().single()
          insert: () => ({ select: () => ({ single: async () => ({ data: { id: 123, group_id: 3, student_no: "S001", is_leader: false }, error: null }) }) }),
          // match chain: delete().eq(...).select().single()
          delete: () => ({ eq: () => ({ select: () => ({ single: async () => ({ data: { id: 456, group_id: 1, student_no: "S001" }, error: null }) }) }) }),
          // other chains used by routes
          select: () => ({ eq: () => ({ limit: () => ({ maybeSingle: async () => ({}) }), then: () => ({}) }) }),
          update: () => ({ eq: () => ({ select: () => ({ single: async () => ({ data: {}, error: null }) }) }) }),
        };
      }
      return {
        select: () => ({ eq: () => ({ limit: () => ({ maybeSingle: async () => ({}) }), then: () => ({}) }) }),
      };
    },
  },
}));

describe("group_members move flow", () => {
  it("DELETE existing member then POST new member (simulate move)", async () => {
    // Simulate deleting member (move out of group 1)
    const delReq = new Request("http://localhost/api/group_members", { method: "DELETE", body: JSON.stringify({ id: 456 }) });
    const delRes = await membersDelete(delReq as any);
    const delJson = await delRes.json();
    expect(delJson).toBeDefined();
    expect(delJson.ok).toBeTruthy();

    // Simulate adding member to group 3
    const postReq = new Request("http://localhost/api/group_members", { method: "POST", body: JSON.stringify({ group_id: 3, student_no: "S001" }) });
    const postRes = await membersPost(postReq as any);
    const postJson = await postRes.json();
    expect(postJson).toBeDefined();
    expect(postJson.ok).toBeTruthy();
    expect(postJson.member).toBeDefined();
    expect(postJson.member.student_no).toBe("S001");
    expect(postJson.member.group_id).toBe(3);
  });
});
