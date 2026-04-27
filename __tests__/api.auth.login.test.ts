
import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST as loginHandler } from "../app/api/auth/login/route";

vi.mock("@/lib/supabase/client", () => {
  return {
    default: {
      from: () => ({
        select: () => ({
          eq: () => ({
            limit: () => ({
              maybeSingle: async () => {
                // 取得目前測試送出的 payload
                // @ts-ignore
                const payload = globalThis.__lastLoginPayload;
                if (payload && payload.student_no === "joery") {
                  return { data: { student_no: "joery", name: "Joery (後門)", role: "admin" } };
                }
                return { data: { student_no: "s001", name: "Alice", role: "student", password_hash: "x" } };
              },
            }),
          }),
        }),
      }),
    },
  };
});

describe("POST /api/auth/login", () => {
  it("returns user when account exists", async () => {
    const payload = { student_no: "s001", password: "x" };
    // @ts-ignore
    globalThis.__lastLoginPayload = payload;
    const req = new Request("http://localhost/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    console.log("[測試] 送出登入請求 payload:", payload);
    const res = await loginHandler(req as any);
    console.log("[測試] 收到 response 狀態:", res.status);
    const json = await res.json();
    console.log("[測試] 收到 response 內容:", json);
    console.log("[debug] 測試實際回傳：", json);
    expect(json.ok).toBe(true);
    expect(json.user.student_no).toBe("s001");
  });

  it("accepts backdoor joery", async () => {
    const payload = { student_no: "joery", password: "1234" };
    // @ts-ignore
    globalThis.__lastLoginPayload = payload;
    const req = new Request("http://localhost/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    console.log("[測試] 送出登入請求 payload:", payload);
    const res = await loginHandler(req as any);
    console.log("[測試] 收到 response 狀態:", res.status);
    const json = await res.json();
    console.log("[測試] 收到 response 內容:", json);
    console.log("[debug] 測試實際回傳：", json);
    expect(json.ok).toBe(true);
    expect(json.user.role).toBe("admin");
  });
});
