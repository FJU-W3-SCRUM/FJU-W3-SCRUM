import { describe, it, expect, vi } from "vitest";
import { POST as importHandler } from "../app/api/import/route";

vi.mock("@/lib/supabase/client", () => {
  return {
    default: {
      rpc: async (fn: string, args: any) => ({ data: { imported: args.rows.length }, error: null }),
    },
  };
});

describe("POST /api/import", () => {
  it("imports CSV atomically via RPC", async () => {
    const csv = "student_no,name\nS1,AAA\nS2,BBB\n";
    const req = new Request("http://localhost/api/import", { method: "POST", body: csv });
    const res = await importHandler(req as any);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.result.imported).toBe(2);
  });
});
