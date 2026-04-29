import { describe, it, expect, vi } from "vitest";
import { GET as groupsGet, POST as groupsPost } from "../app/api/groups/route";

vi.mock("@/lib/supabase/client", () => ({
  default: {
    from: (table: string) => ({
      select: (columns?: string) => {
        // 如果查詢 id 欄位，模擬查無重複群組名稱
        if (columns === "id") {
          return {
            eq: () => ({
              eq: () => ({
                limit: () => ({
                  maybeSingle: async () => ({ data: null, error: null })
                })
              })
            })
          };
        }
        // 其他查詢支援 order/eq/limit/maybeSingle
        return {
          order: () => ({
            eq: () => ({
              limit: () => ({
                maybeSingle: async () => ({})
              })
            })
          })
        };
      },
      insert: () => ({
        select: () => ({
          single: async () => ({
            data: { id: 1, group_name: "G1", class_id: 1 },
            error: null
          })
        })
      })
    })
  }
}));

describe("groups API", () => {
  it("GET returns groups list (mocked)", async () => {
    console.debug("[測試] 取得群組列表發送 GET 請求");
    const req = new Request("http://localhost/api/groups");
    const res = await groupsGet(req);
    console.debug("[測試] GET response 狀態:", res.status);
    const json = await res.json();
    console.debug("[測試] GET response 內容:", json);
    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(Array.isArray(json.groups) || json.groups === undefined).toBe(true);
  });

  it("POST can create a group (mocked)", async () => {
    const payload = { group_name: "New", class_id: 1 };
    console.debug("[測試] 建立群組 payload:", payload);
    const req = new Request("http://localhost/api/groups", { method: "POST", body: JSON.stringify(payload) });
    const res = await groupsPost(req as any);
    console.debug("[測試] POST response 狀態:", res.status);
    const json = await res.json();
    console.debug("[測試] POST response 內容:", json);
    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.group).toBeDefined();
    expect(json.group.group_name).toBe("G1");
  });
});
