import { describe, it, expect, vi } from "vitest";
import { POST as importHandler } from "@/app/api/import/route";
import { NextRequest } from "next/server";

vi.mock('@/lib/supabase/client', () => {
  const mockInsert = vi.fn().mockReturnThis();
  const mockSelect = vi.fn(() => ({ error: null, count: 2 }));
  const mockEq = vi.fn(() => ({ data: [], error: null }));

  const supabase = {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: mockEq,
      })),
      insert: mockInsert,
    })),
  };

  supabase.from.mockImplementation(() => ({
    select: vi.fn(() => ({
      eq: mockEq,
    })),
    insert: vi.fn(() => ({
      select: mockSelect,
    })),
  }));

  return {
    __esModule: true,
    default: supabase, // Add default export
    supabase,
  };
});

// Mock 'next/headers'
vi.mock("next/headers", () => ({
  cookies: vi.fn(() => "dummy-cookies"),
}));

describe("POST /api/import", () => {
  it("should import students successfully according to the new rules", async () => {
    const csvPayload = `王大明,S123456\n陳小美,S654321`;
    const classId = "1";

    const req = new NextRequest("http://localhost/api/import", {
      method: "POST",
      body: JSON.stringify({ csv: `name,student_no\n${csvPayload}`, class_id: classId }),
    });

    const res = await importHandler(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.result.imported_count).toBe(2);
    expect(json.result.duplicate_count).toBe(0);
  });

  it("should reject import if class_id is missing", async () => {
    const csvPayload = `王大明,S123456`;
    const req = new NextRequest("http://localhost/api/import", {
      method: "POST",
      body: JSON.stringify({ csv: `name,student_no\n${csvPayload}` }), // No class_id
    });

    const res = await importHandler(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.ok).toBe(false);
    expect(json.error).toBe("缺少 CSV 資料或班級 ID");
  });

  it("should detect and report duplicates", async () => {
    // Mock that S123456 already exists in the DB for this class
    const { supabase } = await import("@/lib/supabase/client");
    
    (supabase.from("accounts").select().eq as any).mockResolvedValue({
        data: [{ student_no: "S123456" }],
        error: null,
    });

    const csvPayload = `王大明,S123456\n陳小美,S654321`;
    const classId = "1";

    const req = new NextRequest("http://localhost/api/import", {
      method: "POST",
      body: JSON.stringify({ csv: `name,student_no\n${csvPayload}`, class_id: classId }),
    });

    const res = await importHandler(req);
    const json = await res.json();
    
    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.result.imported_count).toBe(1); // Only S654321 is new
    expect(json.result.duplicate_count).toBe(1);
    expect(json.result.duplicates_detail).toEqual([{ row: 2, student_no: "S123456" }]);
  });
});
