# SP2002 功能整合指南

## 📦 新建組件

### 1. ScoreQueryPanel.tsx (Task02 - 分數查詢)
**路徑:** `components/ScoreQueryPanel.tsx`

#### 功能
- 老師可查詢所有班別的所有學生成績
- 學生只能查詢同班成績
- 支持班別篩選和關鍵字搜尋
- 顯示統計摘要 (總舉手、總被點、總分)

#### 使用方式
```tsx
import ScoreQueryPanel from "@/components/ScoreQueryPanel";

export default function MyPage({ user }) {
  return (
    <ScoreQueryPanel
      user={{
        id: user.id,
        role: user.role,
        name: user.name
      }}
    />
  );
}
```

#### Props
```typescript
interface ScoreQueryPanelProps {
  user: {
    id: string;              // 使用者 ID (必須)
    student_no?: string;     // 學號
    role?: string;           // 'admin' 或 'student'
    name?: string;           // 姓名
  };
}
```

---

### 2. GroupMembersWithScores.tsx (Task01 - 分組成員分數顯示)
**路徑:** `components/GroupMembersWithScores.tsx`

#### 功能
- 在分組名單中顯示每位學生的發言統計
- 格式: `姓名 (學號)<組長>     (被點次數/舉手次數; 分數)`
- 實時加載課堂內的分數統計
- 支持組員點擊回調

#### 使用方式
```tsx
import GroupMembersWithScores from "@/components/GroupMembersWithScores";

export default function GroupPage({ sessionId, members }) {
  return (
    <GroupMembersWithScores
      sessionId={sessionId}
      members={members}
      onMemberSelect={(memberId) => {
        console.log("Selected:", memberId);
      }}
    />
  );
}
```

#### Props
```typescript
interface GroupMembersWithScoresProps {
  sessionId: string;              // 課堂 ID (必須)
  members: GroupMember[];         // 組員列表 (必須)
  onMemberSelect?: (memberId: string) => void;  // 點擊回調
}

interface GroupMember {
  id: string;              // 組員記錄 ID
  group_id: string;        // 分組 ID
  account_id: string;      // 帳號 ID
  is_leader: boolean;      // 是否為組長
  student_no: string;      // 學號
  name: string;            // 姓名
}
```

---

## 🔌 整合步驟

### Step1: 在現有頁面中新增分數查詢功能

#### 修改方案 A: 在首頁或導覽新增選項卡

假設你的主頁面有多個選項卡 (例如: 教室、報告模式、分數查詢)：

```tsx
// components/MainPanel.tsx
"use client";

import { useState } from "react";
import ReportModePanel from "@/components/ReportModePanel";
import ScoreQueryPanel from "@/components/ScoreQueryPanel";

export default function MainPanel({ user }) {
  const [activeTab, setActiveTab] = useState<"report" | "query">("report");

  return (
    <div className="max-w-4xl mx-auto">
      {/* Tab Navigation */}
      <div className="flex gap-2 mb-6 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab("report")}
          className={`px-4 py-2 font-semibold transition-colors ${
            activeTab === "report"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          報告模式
        </button>
        <button
          onClick={() => setActiveTab("query")}
          className={`px-4 py-2 font-semibold transition-colors ${
            activeTab === "query"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          分數查詢
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === "report" && <ReportModePanel user={user} />}
      {activeTab === "query" && <ScoreQueryPanel user={user} />}
    </div>
  );
}
```

---

### Step2: 在會話/課堂頁面中顯示分組成員分數

#### 修改方案 B: 在分組成員列表中使用新組件

假設你已經有一個顯示分組成員的頁面：

```tsx
// app/sessions/[session_id]/page.tsx
"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import GroupMembersWithScores from "@/components/GroupMembersWithScores";

interface GroupMember {
  id: string;
  group_id: string;
  account_id: string;
  is_leader: boolean;
  student_no: string;
  name: string;
}

export default function SessionPage() {
  const params = useParams();
  const sessionId = params.session_id as string;
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMembers();
  }, [sessionId]);

  const loadMembers = async () => {
    try {
      // 從你的 API 或資料庫獲取當前會話的分組成員
      const response = await fetch(`/api/sessions/${sessionId}/members`);
      const data = await response.json();
      setMembers(data.members || []);
    } catch (error) {
      console.error("Failed to load members:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>載入中...</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">課堂互動 - 分組成員</h1>
      
      <GroupMembersWithScores
        sessionId={sessionId}
        members={members}
        onMemberSelect={(memberId) => {
          // 可選：處理組員點擊事件
          console.log("Selected member:", memberId);
        }}
      />
    </div>
  );
}
```

---

## 🎨 UI 示例

### ScoreQueryPanel UI
```
┌────────────────────────────────────────┐
│  分數查詢                               │
├────────────────────────────────────────┤
│ 查詢條件                                │
│ ┌──────────────────────────────────┐  │
│ │ 班別: [高一甲班 ▼]               │  │
│ │ 學生: [搜尋...]                  │  │
│ │ [查詢] [重置]                    │  │
│ └──────────────────────────────────┘  │
├────────────────────────────────────────┤
│ 查詢結果 (6 筆)                         │
│ ┌──────────────────────────────────┐  │
│ │ 高一甲班 - 第1堂課               │  │
│ ├──────────────────────────────────┤  │
│ │ 班別 │學號 │姓名 │舉手│被點│分數  │  │
│ ├──────────────────────────────────┤  │
│ │高一甲│4100│林小明│  5│ 2│  8   │  │
│ │高一甲│4101│王小美│  3│ 1│  3   │  │
│ └──────────────────────────────────┘  │
├────────────────────────────────────────┤
│ 總舉手次數: 8 │總被點: 3 │總分: 11     │
└────────────────────────────────────────┘
```

### GroupMembersWithScores UI
```
┌──────────────────────────────────────────┐
│ 林小明 (414100001)<組長>   (2/5; 8)      │
│                   舉手:5 │被點:2 │分:8   │
├──────────────────────────────────────────┤
│ 王小美 (414100002)        (1/3; 3)       │
│                   舉手:3 │被點:1 │分:3   │
└──────────────────────────────────────────┘
```

---

## 📊 API 端點參考

### Task01 API - 學生分數統計
```bash
GET /api/scores/student-scores?sessionId=xxx[&accountId=xxx]

Response:
{
  "ok": true,
  "data": [
    {
      "account_id": "student-001",
      "student_no": "414100001",
      "name": "林小明",
      "answerCount": 2,      # 被點次數
      "raiseCount": 5,       # 舉手次數
      "totalScore": 8        # 分數
    }
  ]
}
```

### Task02 API - 分數查詢
```bash
GET /api/scores/query
  ?userId=xxx
  &userRole=admin|student
  &classId=xxx (可選)
  &keyword=xxx (可選)

Response:
{
  "ok": true,
  "data": [
    {
      "class_id": "class-001",
      "class_name": "高一甲班",
      "session_id": "session-001",
      "session_title": "第1堂課",
      "account_id": "student-001",
      "student_no": "414100001",
      "name": "林小明",
      "raiseCount": 5,
      "answerCount": 2,
      "totalScore": 8
    }
  ]
}
```

---

## ⚙️ 權限控制

### ScoreQueryPanel 權限
- **老師 (admin)**
  - 班別 Dropdown: 顯示所有班別
  - 查詢範圍: 所有班別所有學生
  
- **學生 (student)**
  - 班別 Dropdown: 只顯示自己的班別
  - 查詢範圍: 同班學生

### GroupMembersWithScores 權限
- 無權限限制，會自動加載並顯示成績
- 適用於所有用戶

---

## 🧪 測試方式

### 測試 ScoreQueryPanel
```bash
# 1. 以老師身份登入
# 2. 進入分數查詢頁面
# 3. 選擇班別，搜尋學生
# 4. 驗證搜尋結果正確

# 5. 以學生身份登入
# 6. 進入分數查詢頁面
# 7. 驗證班別只顯示自己的班別
# 8. 驗證搜尋範圍限制在同班
```

### 測試 GroupMembersWithScores
```bash
# 1. 進入會話/課堂頁面
# 2. 驗證分組成員列表顯示成績
# 3. 驗證格式正確: (被點/舉手; 分數)
# 4. 驗證組長標籤顯示
# 5. 點擊成員驗證回調觸發
```

---

## 📝 後續可選改進

### 增強功能
- [ ] 導出成績為 CSV/Excel
- [ ] 排序功能 (按成績排序)
- [ ] 時間範圍篩選
- [ ] 成績圖表視覺化
- [ ] 缺勤記錄

### 性能優化
- [ ] 分頁功能 (大量數據)
- [ ] 緩存機制
- [ ] 虛擬滾動

### UI/UX 改進
- [ ] 無障礙設計 (a11y)
- [ ] 行動裝置優化
- [ ] 深色模式支援

---

## 🚀 開發完成清單

- [x] Task01 API 實現 ✅
- [x] Task02 API 實現 ✅
- [x] ScoreQueryPanel 組件 ✅
- [x] GroupMembersWithScores 組件 ✅
- [x] 編譯驗證通過 ✅
- [x] 整合指南完成 ✅
- [ ] 前端頁面集成 (待用戶完成)
- [ ] E2E 測試 (待用戶完成)

---

**最後更新**: 2026-04-28  
**狀態**: ✅ 功能完成，可整合
