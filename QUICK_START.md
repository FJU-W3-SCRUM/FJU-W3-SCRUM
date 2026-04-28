# SP2002 功能快速開始

## ✅ 已完成

### 🔧 後端實現
- ✅ Task01 API: `/api/scores/student-scores` - 獲取學生分數統計
- ✅ Task02 API: `/api/scores/query` - 查詢分數 (含權限控制)
- ✅ 所有業務邏輯已實現

### 🎨 前端組件
- ✅ `ScoreQueryPanel.tsx` - 分數查詢面板 (Task02)
- ✅ `GroupMembersWithScores.tsx` - 分組成員分數顯示 (Task01)
- ✅ 所有組件已通過編譯

### 📖 文檔
- ✅ `INTEGRATION_GUIDE.md` - 完整整合指南
- ✅ 測試用例: 25/25 ✅
- ✅ API 文檔完整

---

## 🚀 立即使用

### 方式 1: 快速測試 API

```bash
# Task01 - 獲取學生分數
curl "http://localhost:3000/api/scores/student-scores?sessionId=<session_id>&accountId=<student_id>"

# Task02 - 查詢分數
curl "http://localhost:3000/api/scores/query?userId=<user_id>&userRole=admin"
```

### 方式 2: 在頁面中使用組件

#### 使用 ScoreQueryPanel (分數查詢)
```tsx
import ScoreQueryPanel from "@/components/ScoreQueryPanel";

// 在你的頁面中
<ScoreQueryPanel user={user} />
```

#### 使用 GroupMembersWithScores (分組成員)
```tsx
import GroupMembersWithScores from "@/components/GroupMembersWithScores";

// 在你的頁面中
<GroupMembersWithScores 
  sessionId={sessionId} 
  members={members}
/>
```

---

## 📋 特性清單

### Task01: 報告模式分數顯示
- ✅ 計算被點次數 (status='A')
- ✅ 計算舉手次數 (所有記錄)
- ✅ 計算評點分數 (ratings.star加總)
- ✅ UI 格式: `名字 (學號)<組長> (被點/舉手; 分數)`
- ✅ 實時加載組員分數

### Task02: 分數查詢功能
- ✅ 老師可查詢所有班別的所有學生
- ✅ 學生只能查詢同班學生
- ✅ 班別篩選
- ✅ 學號/姓名關鍵字搜尋
- ✅ 結果統計 (總舉手、總被點、總分)
- ✅ 班別 Dropdown 權限控制

---

## 📁 新建文件

```
components/
├── ScoreQueryPanel.tsx          (分數查詢面板)
└── GroupMembersWithScores.tsx   (分組成員分數)

lib/services/
├── student-score-service.ts     (Task01 業務邏輯)
└── score-query-service.ts       (Task02 業務邏輯)

app/api/scores/
├── student-scores/route.ts      (Task01 API)
└── query/route.ts               (Task02 API)

__tests__/sprint-sp2002/
├── task01-student-score.test.ts (10 tests ✅)
├── task02-score-query.test.ts   (15 tests ✅)
├── IMPLEMENTATION_PLAN.md
├── DEVELOPMENT_SUMMARY.md
└── README.md

INTEGRATION_GUIDE.md             (整合指南)
```

---

## 🎯 下一步

### Option A: 自動集成 (推薦)
1. 在你的主頁面添加選項卡
2. 引入 `ScoreQueryPanel` 和 `ReportModePanel`
3. 完成！

### Option B: 手動集成
1. 查看 `INTEGRATION_GUIDE.md` 詳細步驟
2. 根據你的設計修改組件
3. 在需要的地方使用

### Option C: 自訂集成
1. 複製組件代碼
2. 根據需要修改樣式和邏輯
3. 集成到你的應用中

---

## 🧪 驗證編譯

```bash
# 編譯檢查
npm run build

# 測試驗證
npm test -- __tests__/sprint-sp2002/
```

✅ 所有測試通過 (25/25)  
✅ 編譯無誤  
✅ 已準備就緒  

---

## 💡 使用提示

1. **ScoreQueryPanel 需要的 Props**
   ```tsx
   user={{ id: string, role: 'admin'|'student', name?: string }}
   ```

2. **GroupMembersWithScores 需要的 Props**
   ```tsx
   sessionId={string}
   members={Array<{ id, group_id, account_id, is_leader, student_no, name }>}
   ```

3. **API 響應格式**
   - 成功: `{ ok: true, data: [...] }`
   - 失敗: `{ ok: false, error: "message" }`

---

## 📞 常見問題

### Q: 如何顯示分數在分組名單？
A: 使用 `GroupMembersWithScores` 組件，傳入 `sessionId` 和 `members`。

### Q: 權限如何控制？
A: 後端 API 自動根據 `userRole` 和 `userId` 進行權限檢查。

### Q: 如何自訂 UI？
A: 查看 `INTEGRATION_GUIDE.md` 中的修改範例。

### Q: 如何新增更多篩選條件？
A: 修改 `ScoreQueryPanel` 中的查詢表單或 API 參數。

---

## ✨ 完成度

| 項目 | 狀態 | 進度 |
|------|------|------|
| 後端 API | ✅ 完成 | 100% |
| 業務邏輯 | ✅ 完成 | 100% |
| 前端組件 | ✅ 完成 | 100% |
| 測試覆蓋 | ✅ 完成 | 100% |
| 文檔 | ✅ 完成 | 100% |
| **總進度** | **✅ 完成** | **100%** |

---

**開發日期**: 2026-04-28  
**最後更新**: 即刻  
**狀態**: 🚀 已準備部署  
