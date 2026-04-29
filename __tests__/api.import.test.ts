// Mock supabase client，避免測試時真的連線 Supabase
import { vi } from "vitest";
// 建立可在 it 區塊自訂的 mock 行為
const mockSelect = vi.fn();
const mockInsert = vi.fn();
vi.mock("@/lib/supabase/client", () => ({
  __esModule: true,
  default: {
    from: () => ({
      select: () => ({
        eq: () => mockSelect(),
      }),
      insert: mockInsert,
    }),
  },
}));
import { describe, it, expect} from "vitest";
import { POST as importHandler } from "../app/api/import/route";
import { NextRequest } from "next/server";

// Mock the auth-helpers-nextjs module
vi.mock("@supabase/auth-helpers-nextjs", () => {
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
  
  // Add a way to access the mock insert to check calls
  supabase.from.mockImplementation(() => ({
    select: vi.fn(() => ({
      eq: mockEq,
    })),
    insert: vi.fn(() => ({
        select: mockSelect
    })),
  }));


  return {
    createRouteHandlerClient: vi.fn(() => supabase),
  };
});

// Mock 'next/headers'
vi.mock("next/headers", () => ({
  cookies: vi.fn(() => "dummy-cookies"),
}));

describe("POST /api/import", () => {
  it("should import students successfully according to the new rules", async () => {
    // mock 查詢 class_id 下無重複學號
    mockSelect.mockReturnValueOnce({ data: [], error: null });
    mockInsert.mockReturnValueOnce({ error: null });
    const csvPayload = `王大明,S123456\n陳小美,S654321`;
    const classId = "1";
    const payload = { csv: `name,student_no\n${csvPayload}`, class_id: classId };
    console.debug("[測試] 匯入成功 payload:", payload);
    const req = new NextRequest("http://localhost/api/import", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    const res = await importHandler(req);
    console.debug("[測試] 匯入成功 response 狀態:", res.status);
    const json = await res.json();
    console.debug("[測試] 匯入成功 response 內容:", json);

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.result.imported_count).toBe(2);
    expect(json.result.duplicate_count).toBe(0);
  });

  it("should reject import if class_id is missing", async () => {
    const csvPayload = `王大明,S123456`;
    const payload = { csv: `name,student_no\n${csvPayload}` };
    console.debug("[測試] 缺少 class_id payload:", payload);
    const req = new NextRequest("http://localhost/api/import", {
      method: "POST",
      body: JSON.stringify(payload), // No class_id
    });

    const res = await importHandler(req);
    console.debug("[測試] 缺少 class_id response 狀態:", res.status);
    const json = await res.json();
    console.debug("[測試] 缺少 class_id response 內容:", json);

    expect(res.status).toBe(400);
    expect(json.ok).toBe(false);
    expect(json.error).toBe("缺少 CSV 資料或班級 ID");
  });

  it("should detect and report duplicates", async () => {
    // mock 查詢 class_id 下已有 S123456
    mockSelect.mockReturnValueOnce({ data: [{ student_no: "S123456" }], error: null });
    mockInsert.mockReturnValueOnce({ error: null });
    const csvPayload = `王大明,S123456\n陳小美,S654321`;
    const classId = "1";
    const payload = { csv: `name,student_no\n${csvPayload}`, class_id: classId };
    console.debug("[測試] 重複學號 payload:", payload);
    const req = new NextRequest("http://localhost/api/import", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    const res = await importHandler(req);
    console.debug("[測試] 重複學號 response 狀態:", res.status);
    const json = await res.json();
    console.debug("[測試] 重複學號 response 內容:", json);
    
    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.result.imported_count).toBe(1); // Only S654321 is new
    expect(json.result.duplicate_count).toBe(1);
    expect(json.result.duplicates_detail).toEqual([{ row: 2, student_no: "S123456" }]);
  });
});
