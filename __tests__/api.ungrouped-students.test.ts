import { describe, it, expect, vi } from "vitest";
import { GET as getUngrouped } from "../app/api/ungrouped-students/route";

// Mock supabase client to simulate accounts, groups and group_members
vi.mock("@/lib/supabase/client", () => ({
  default: {
    from: (table: string) => {
      if (table === "accounts") {
        return {
          select: () => ({
            eq: async () => ({ data: [
              { student_no: "S001", name: "Alice" },
              { student_no: "S002", name: "Bob" },
              { student_no: "S003", name: "Carol" }
            ], error: null })
          })
        };
      }

      if (table === "groups") {
        return {
          select: () => ({
            eq: async () => ({ data: [ { id: 1 }, { id: 2 } ], error: null })
          })
        };
      }

      if (table === "group_members") {
        return {
          select: () => ({
            in: async () => ({ data: [ { student_no: "S001" }, { student_no: "S002" } ], error: null })
          })
        };
      }

      return { select: () => ({ eq: async () => ({ data: [], error: null }) }) };
    }
  }
}));

describe("ungrouped-students API", () => {
  it("excludes students already assigned to any group in the class", async () => {
    const req = new Request("http://localhost/api/ungrouped-students?class_id=100&group_id=3");
    const res = await getUngrouped(req as any);
    const j = await res.json();
    expect(j).toBeDefined();
    expect(j.ok).toBeTruthy();
    // Only S003 should remain ungrouped
    const nos = (j.students || []).map((s: any) => s.student_no);
    expect(nos).toContain("S003");
    expect(nos).not.toContain("S001");
    expect(nos).not.toContain("S002");
  });
});
