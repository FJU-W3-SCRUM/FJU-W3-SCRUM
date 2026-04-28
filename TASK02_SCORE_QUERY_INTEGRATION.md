# Task02 - 分數查詢功能集成說明

## 📋 功能概述

分數查詢功能讓使用者查詢學生的分課統計，支援：
- **老師**: 查詢所有班別的所有學生分數
- **學生**: 只能查詢同班同學的分數

## 🎯 使用位置

### 推薦方案：在主導航中添加「分數查詢」選項

#### 方案 A: 標籤頁方式 (推薦)
在首頁或主面板添加選項卡：

```tsx
import ScoreQueryPanel from "@/components/ScoreQueryPanel";
import ReportModePanel from "@/components/ReportModePanel";

export default function TeacherDashboard({ user }) {
  const [activeTab, setActiveTab] = useState<"report" | "query">("report");

  return (
    <div>
      {/* 標籤導航 */}
      <div className="flex gap-4 border-b mb-6">
        <button
          onClick={() => setActiveTab("report")}
          className={`px-4 py-2 font-semibold ${
            activeTab === "report" 
              ? "border-b-2 border-blue-600 text-blue-600"
              : "text-gray-600"
          }`}
        >
          報告模式
        </button>
        <button
          onClick={() => setActiveTab("query")}
          className={`px-4 py-2 font-semibold ${
            activeTab === "query"
              ? "border-b-2 border-blue-600 text-blue-600"
              : "text-gray-600"
          }`}
        >
          分數查詢
        </button>
      </div>

      {/* 內容區 */}
      {activeTab === "report" && <ReportModePanel user={user} />}
      {activeTab === "query" && <ScoreQueryPanel user={user} />}
    </div>
  );
}
```

#### 方案 B: 左側菜單方式

在左側導航中添加新菜單項：

```tsx
<nav className="space-y-2">
  <NavItem href="/report" icon="📊">報告模式</NavItem>
  <NavItem href="/scores" icon="📈">分數查詢</NavItem>
</nav>
```

然後在相應頁面中使用 `<ScoreQueryPanel user={user} />` 組件。

## 🔍 功能詳解

### Task02 API 端點

#### GET /api/scores/query - 查詢分數
```bash
GET /api/scores/query
  ?userId=<user_id>
  &userRole=admin|student
  &classId=<class_id> (可選)
  &keyword=<search> (可選)

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

#### POST /api/scores/query/teacher-classes - 老師班級列表
```bash
POST /api/scores/query/teacher-classes
Content-Type: application/json

{ "teacherId": "<teacher_id>" }

Response:
{
  "ok": true,
  "data": [
    { "id": "class-001", "name": "高一甲班" },
    { "id": "class-002", "name": "高一乙班" }
  ]
}
```

#### POST /api/scores/query/student-classes - 學生班級列表
```bash
POST /api/scores/query/student-classes
Content-Type: application/json

{ "studentId": "<student_id>" }

Response:
{
  "ok": true,
  "data": [
    { "id": "class-001", "name": "高一甲班" }
  ]
}
```

## 📊 查詢結果展示

### 結果按課堂分組：
```
高一甲班 - 第1堂課
┌──────────┬──────┬──────┬──────┬──────┬──────┐
│ 班別     │ 學號 │ 姓名 │ 舉手 │ 被點 │ 分數 │
├──────────┼──────┼──────┼──────┼──────┼──────┤
│ 高一甲班 │4100 │林小明│ 5    │ 2    │ 8   │
│ 高一甲班 │4101 │王小美│ 3    │ 1    │ 3   │
└──────────┴──────┴──────┴──────┴──────┴──────┘
```

### 統計摘要：
```
總舉手次數: 8  │  總被點次數: 3  │  總評點分數: 11
```

## 🔐 權限控制

### 老師 (admin/teacher)
- ✅ 班別 Dropdown: 顯示**所有班別**
- ✅ 查詢範圍: **所有班別所有學生**
- ✅ 可按班別篩選
- ✅ 可按學號/姓名搜尋

### 學生 (student)
- ✅ 班別 Dropdown: **僅顯示自己的班別** (自動選中)
- ✅ 查詢範圍: **同班學生only**
- ✅ 嘗試跨班查詢會被系統拒絕
- ✅ 可按同班學生搜尋

## 🧪 測試情景

### 情景 1: 老師查詢所有班別
1. 以老師身份登入
2. 進入分數查詢頁面
3. 班別 Dropdown 顯示所有班別 ✅
4. 選擇班別，搜尋學生 ✅
5. 驗證結果顯示該班所有學生 ✅

### 情景 2: 學生只能查同班
1. 以學生身份登入
2. 進入分數查詢頁面
3. 班別 Dropdown 只顯示自己的班別 ✅
4. 搜尋同班同學 ✅
5. 嘗試手動改變班別 ID (無效) ✅

### 情景 3: 關鍵字搜尋
1. 進入分數查詢
2. 在學生搜尋框輸入：
   - 學號 (例：414100001) ✅
   - 姓名 (例：林小明) ✅
   - 部分學號 (例：4141) ✅
3. 驗證結果過濾正確 ✅

### 情景 4: 空結果處理
1. 搜尋不存在的學號
2. 系統顯示「查無符合條件的記錄」✅
3. 結果統計為 0 ✅

## 📝 ScoreQueryPanel Props

```typescript
interface ScoreQueryPanelProps {
  user: {
    id: string;        // 使用者 ID (必須)
    role?: string;     // 'admin' 或 'student' (必須)
    name?: string;     // 姓名 (可選)
  };
}
```

## 🎨 UI 特性

- ✅ 深色模式支援
- ✅ 響應式設計 (行動/桌面)
- ✅ 加載狀態指示
- ✅ 錯誤信息提示
- ✅ 結果分頁友善
- ✅ 搜尋即時反應

## 🚀 集成步驟

### Step 1: 導入組件
```tsx
import ScoreQueryPanel from "@/components/ScoreQueryPanel";
```

### Step 2: 在頁面中使用
```tsx
<ScoreQueryPanel 
  user={{
    id: user.id,
    role: user.role,
    name: user.name
  }}
/>
```

### Step 3: 驗證運行
```bash
npm run dev
# 瀏覽器打開並測試查詢功能
```

## 📊 常見查詢場景

### 場景 1: 查詢某班所有學生本週成績
1. 選擇班別
2. 不輸入搜尋關鍵字
3. 點擊查詢 → 返回該班所有學生

### 場景 2: 查詢特定學生成績
1. 輸入學號或姓名
2. 點擊查詢 → 返回匹配結果

### 場景 3: 查詢多堂課成績
1. 查詢結果按課堂自動分組
2. 每堂課分別顯示表格
3. 可查看學生跨課堂表現

## ✅ 完成清單

- [x] ScoreQueryPanel 組件實現
- [x] API 端點 (/api/scores/query) 實現
- [x] 權限控制邏輯
- [x] 班別 Dropdown 權限限制
- [x] 關鍵字搜尋功能
- [x] 結果統計摘要
- [x] 編譯驗證通過
- [ ] 集成到應用頁面 (待用戶完成)
- [ ] E2E 測試 (待用戶完成)

## 🔗 相關文件

- [INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md) - 完整整合指南
- [QUICK_START.md](QUICK_START.md) - 快速開始
- [TASK01_REPORT_MODE_INTEGRATION.md](TASK01_REPORT_MODE_INTEGRATION.md) - Task01 說明

---

**開發日期**: 2026-04-28  
**狀態**: ✅ 後端完成，待 UI 集成  
**下一步**: 在應用主頁中添加分數查詢頁面
