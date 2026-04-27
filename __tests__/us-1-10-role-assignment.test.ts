import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET as rolesGet, POST as rolesPost, DELETE as rolesDelete } from "../app/api/session_roles/route";

/**
 * US 1.10: 課堂中指定報告人員與組長 (學員角色指派) SP1005
 *
 * User Story: 身為教師 (Admin) 我想要 在每堂課開始前指定組別內某位學生為「報告人員」，
 * 以及指定一名學員為「組長」 因此我可以 啟動該組別的「評分權限」，
 * 讓組長能夠針對台下提問給予分數。
 */

// 全局模擬資料庫
let mockDB: any[] = [];
let nextId = 1000;

vi.mock("@/lib/supabase/client", () => {
  return {
    default: {
      from: (table: string) => {
        if (table === "session_roles") {
          return {
            select: (cols: string) => ({
              eq: (column: string, value: any) => ({
                data: mockDB.filter(r => r[column] === value),
                error: null,
              }),
            }),
            insert: (records: any[]) => ({
              select: () => ({
                single: async () => {
                  const record = { ...records[0], id: nextId++ };
                  mockDB.push(record);
                  return { data: record, error: null };
                },
              }),
            }),
            delete: () => ({
              eq: (column: string, value: any) => ({
                select: () => ({
                  single: async () => {
                    const idx = mockDB.findIndex(r => r[column] === value);
                    if (idx >= 0) {
                      const [deleted] = mockDB.splice(idx, 1);
                      return { data: deleted, error: null };
                    }
                    return { data: null, error: { message: "Not found" } };
                  },
                }),
              }),
            }),
          };
        }
        return {};
      },
    },
  };
});

describe("US 1.10 - 課堂中指定報告人員與組長", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDB = [];
    nextId = 1000;
  });

  describe("[正向路徑] AC1: 指派組長開啟評分權限", () => {
    it("應成功指派學生 B 為組長", async () => {
      const req = new Request("http://localhost/api/session_roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: 1,
          account_id: "s002", // 學生 B
          role: "group_leader",
          assigned_by: "teacher001",
        }),
      });

      const res = await rolesPost(req as any);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.role).toBeDefined();
      expect(json.role.role).toBe("group_leader");
      expect(json.role.account_id).toBe("s002");
      expect(json.role.session_id).toBe(1);
    });

    it("學生 B 被設為組長後，介面應出現評分元件", async () => {
      // 第一步：指派組長
      const assignReq = new Request("http://localhost/api/session_roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: 1,
          account_id: "s002",
          role: "group_leader",
          assigned_by: "teacher001",
        }),
      });

      const assignRes = await rolesPost(assignReq as any);
      expect(assignRes.ok).toBe(true);

      // 第二步：查詢該 session 的角色清單
      const getReq = new Request("http://localhost/api/session_roles?session_id=1", {
        method: "GET",
      });

      const getRes = await rolesGet(getReq as any);
      expect(getRes.status).toBe(200);

      const json = await getRes.json();
      expect(json.ok).toBe(true);
      expect(json.roles).toBeDefined();
      expect(json.roles.length).toBeGreaterThan(0);

      // 驗證學生 B 的角色
      const studentBRole = json.roles.find((r: any) => r.account_id === "s002");
      expect(studentBRole).toBeDefined();
      expect(studentBRole.role).toBe("group_leader");
    });

    it("其餘非組長學生不應看到評分元件", async () => {
      // 指派組長
      const assignReq = new Request("http://localhost/api/session_roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: 1,
          account_id: "s002",
          role: "group_leader",
          assigned_by: "teacher001",
        }),
      });

      const assignRes = await rolesPost(assignReq as any);
      expect(assignRes.ok).toBe(true);

      // 查詢角色清單
      const getReq = new Request("http://localhost/api/session_roles?session_id=1", {
        method: "GET",
      });

      const getRes = await rolesGet(getReq as any);
      const json = await getRes.json();

      // 驗證只有學生 B 是組長
      const roles = json.roles;
      const groupLeaderCount = roles.filter((r: any) => r.role === "group_leader").length;
      expect(groupLeaderCount).toBeLessThanOrEqual(1);

      // 驗證其他學生 (s001, s003) 不是組長
      const studentARole = roles.find((r: any) => r.account_id === "s001");
      const studentCRole = roles.find((r: any) => r.account_id === "s003");

      if (studentARole) expect(studentARole.role).not.toBe("group_leader");
      if (studentCRole) expect(studentCRole.role).not.toBe("group_leader");
    });
  });

  describe("[正向路徑] AC2: 指派報告人員", () => {
    it("應成功指派學生 A 為報告人員", async () => {
      const req = new Request("http://localhost/api/session_roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: 1,
          account_id: "s001", // 學生 A
          role: "reporter",
          assigned_by: "teacher001",
        }),
      });

      const res = await rolesPost(req as any);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.role.role).toBe("reporter");
      expect(json.role.account_id).toBe("s001");
    });

    it("一個 session 中應可同時指派組長和報告人員", async () => {
      // 指派報告人員
      const reporterReq = new Request("http://localhost/api/session_roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: 1,
          account_id: "s001",
          role: "reporter",
          assigned_by: "teacher001",
        }),
      });

      const reporterRes = await rolesPost(reporterReq as any);
      expect(reporterRes.ok).toBe(true);

      // 指派組長
      const leaderReq = new Request("http://localhost/api/session_roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: 1,
          account_id: "s002",
          role: "group_leader",
          assigned_by: "teacher001",
        }),
      });

      const leaderRes = await rolesPost(leaderReq as any);
      expect(leaderRes.ok).toBe(true);

      // 驗證都被成功指派
      const getReq = new Request("http://localhost/api/session_roles?session_id=1", {
        method: "GET",
      });

      const getRes = await rolesGet(getReq as any);
      const json = await getRes.json();

      expect(json.roles.length).toBe(2);
      expect(json.roles.some((r: any) => r.account_id === "s001" && r.role === "reporter")).toBe(true);
      expect(json.roles.some((r: any) => r.account_id === "s002" && r.role === "group_leader")).toBe(true);
    });
  });

  describe("[錯誤處理] 必填欄位驗證", () => {
    it("缺少 session_id 時應返回錯誤", async () => {
      const req = new Request("http://localhost/api/session_roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          account_id: "s002",
          role: "group_leader",
        }),
      });

      const res = await rolesPost(req as any);
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.ok).toBe(false);
      expect(json.error).toContain("session_id");
    });

    it("缺少 account_id 時應返回錯誤", async () => {
      const req = new Request("http://localhost/api/session_roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: 1,
          role: "group_leader",
        }),
      });

      const res = await rolesPost(req as any);
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.ok).toBe(false);
      expect(json.error).toContain("account_id");
    });

    it("缺少 role 時應返回錯誤", async () => {
      const req = new Request("http://localhost/api/session_roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: 1,
          account_id: "s002",
        }),
      });

      const res = await rolesPost(req as any);
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.ok).toBe(false);
      expect(json.error).toContain("role");
    });
  });

  describe("[正向路徑] 角色移除與更新", () => {
    it("應成功刪除指派的角色", async () => {
      // 先指派組長
      const assignReq = new Request("http://localhost/api/session_roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: 1,
          account_id: "s002",
          role: "group_leader",
          assigned_by: "teacher001",
        }),
      });

      const assignRes = await rolesPost(assignReq as any);
      const assignJson = await assignRes.json();
      const roleId = assignJson.role.id;

      // 再刪除
      const deleteReq = new Request("http://localhost/api/session_roles", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: roleId }),
      });

      const deleteRes = await rolesDelete(deleteReq as any);
      expect(deleteRes.status).toBe(200);

      const deleteJson = await deleteRes.json();
      expect(deleteJson.ok).toBe(true);
      expect(deleteJson.deleted).toBeDefined();
    });

    it("刪除不存在的角色應返回錯誤", async () => {
      const deleteReq = new Request("http://localhost/api/session_roles", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: 99999 }),
      });

      const deleteRes = await rolesDelete(deleteReq as any);
      expect(deleteRes.status).toBe(500);

      const deleteJson = await deleteRes.json();
      expect(deleteJson.ok).toBe(false);
    });
  });

  describe("[完整流程] 一堂課的角色指派流程", () => {
    it("完整流程：查詢 -> 指派組長 -> 指派報告人員 -> 查詢驗證", async () => {
      const sessionId = 2;
      const teacherId = "teacher001";

      // Step 1: 查詢初始角色 (應為空)
      let getReq = new Request(`http://localhost/api/session_roles?session_id=${sessionId}`, {
        method: "GET",
      });

      let getRes = await rolesGet(getReq as any);
      let json = await getRes.json();
      expect(json.ok).toBe(true);
      expect(json.roles).toEqual([]);

      // Step 2: 指派第一組的組長
      let assignReq = new Request("http://localhost/api/session_roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          account_id: "s102",
          role: "group_leader",
          assigned_by: teacherId,
        }),
      });

      let assignRes = await rolesPost(assignReq as any);
      expect(assignRes.ok).toBe(true);

      // Step 3: 指派報告人員
      assignReq = new Request("http://localhost/api/session_roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          account_id: "s101",
          role: "reporter",
          assigned_by: teacherId,
        }),
      });

      assignRes = await rolesPost(assignReq as any);
      expect(assignRes.ok).toBe(true);

      // Step 4: 驗證指派結果
      getReq = new Request(`http://localhost/api/session_roles?session_id=${sessionId}`, {
        method: "GET",
      });

      getRes = await rolesGet(getReq as any);
      json = await getRes.json();

      expect(json.ok).toBe(true);
      expect(json.roles.length).toBe(2);

      // 驗證組長
      const leaderRole = json.roles.find((r: any) => r.account_id === "s102");
      expect(leaderRole).toBeDefined();
      expect(leaderRole.role).toBe("group_leader");
      expect(leaderRole.assigned_by).toBe(teacherId);

      // 驗證報告人員
      const reporterRole = json.roles.find((r: any) => r.account_id === "s101");
      expect(reporterRole).toBeDefined();
      expect(reporterRole.role).toBe("reporter");
      expect(reporterRole.assigned_by).toBe(teacherId);
    });
  });

  describe("[邊界條件] 特殊情況", () => {
    it("一個使用者可以在多個 session 中擔任不同角色", async () => {
      const studentId = "s001";
      const teacherId = "teacher001";

      // 在 session 1 中為組長
      let assignReq = new Request("http://localhost/api/session_roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: 1,
          account_id: studentId,
          role: "group_leader",
          assigned_by: teacherId,
        }),
      });

      let assignRes = await rolesPost(assignReq as any);
      expect(assignRes.ok).toBe(true);

      // 在 session 2 中為報告人員
      assignReq = new Request("http://localhost/api/session_roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: 2,
          account_id: studentId,
          role: "reporter",
          assigned_by: teacherId,
        }),
      });

      assignRes = await rolesPost(assignReq as any);
      expect(assignRes.ok).toBe(true);

      // 驗證 session 1
      let getReq = new Request("http://localhost/api/session_roles?session_id=1", {
        method: "GET",
      });

      let getRes = await rolesGet(getReq as any);
      let json = await getRes.json();
      expect(json.roles.find((r: any) => r.account_id === studentId)?.role).toBe("group_leader");

      // 驗證 session 2
      getReq = new Request("http://localhost/api/session_roles?session_id=2", {
        method: "GET",
      });

      getRes = await rolesGet(getReq as any);
      json = await getRes.json();
      expect(json.roles.find((r: any) => r.account_id === studentId)?.role).toBe("reporter");
    });

    it("GET 查詢不存在的 session 應返回空清單", async () => {
      const getReq = new Request("http://localhost/api/session_roles?session_id=9999", {
        method: "GET",
      });

      const getRes = await rolesGet(getReq as any);
      expect(getRes.status).toBe(200);

      const json = await getRes.json();
      expect(json.ok).toBe(true);
      expect(json.roles).toEqual([]);
    });

    it("GET 缺少 session_id 參數應返回錯誤", async () => {
      const getReq = new Request("http://localhost/api/session_roles", {
        method: "GET",
      });

      const getRes = await rolesGet(getReq as any);
      expect(getRes.status).toBe(400);

      const json = await getRes.json();
      expect(json.ok).toBe(false);
      expect(json.error).toContain("session_id");
    });
  });
});
