# 星級評分功能實現文檔

## 📋 概述

本實現包含 US 3.1 (老師評分) 和 US 3.2 (報告組評分) 的完整解決方案，支持：

- ✅ 1-5 星級評分介面
- ✅ 極簡操作（點選星級即送出）
- ✅ 「已送出」氣泡反饋
- ✅ 前端自動隱藏同組無法評分的選項
- ✅ 後端防弊驗證

---

## 🏗️ 項目結構

```
components/
├── StarRating.tsx           # 星級評分互動組件
├── StarRating.module.css    # 星級評分樣式
├── RatingDisplay.tsx        # 評分統計顯示組件
└── RatingScene.tsx          # 集成示例場景

app/api/
└── ratings/
    └── submit/
        └── route.ts         # 星級評分 API 路由（防弊驗證）

__tests__/
└── api.ratings.test.ts      # API 測試
```

---

## 🎯 使用案例

### 案例 1：老師評分學生回答（US 3.1）

```tsx
import StarRating from "@/components/StarRating";

export default function TeacherGradeStudent() {
  return (
    <StarRating
      sessionId={1}              // 會議 ID
      answerId={5}               // 答題紀錄 ID
      currentUserId={100}        // 老師 ID
      userRole="teacher"         // 角色：老師
      answererUserId={200}       // 學生 ID
      onSubmit={(rating) => {
        console.log(`老師給了 ${rating} 顆星`);
      }}
    />
  );
}
```

**預期行為：**
- 老師可以給任何學生評分
- 點選星級立即送出
- 送出後顯示「✓ 已送出」氣泡（2.5 秒後消失）

---

### 案例 2：報告組評分其他組別回答（US 3.2）

```tsx
import StarRating from "@/components/StarRating";

export default function GroupRepresentativeGrade() {
  return (
    <StarRating
      sessionId={1}
      answerId={5}
      currentUserId={300}           // 組長 ID
      userRole="group_representative"
      answererUserId={200}
      userGroupId={10}              // 組長所屬組別
      answererGroupId={11}          // 被評分者所屬組別
      onSubmit={(rating) => {
        console.log(`組長給了 ${rating} 顆星`);
      }}
    />
  );
}
```

**預期行為：**
- 如果 `userGroupId === answererGroupId`（同組）
  - 星星呈現灰色，禁用狀態
  - 顯示「無法對自己評分」提示
  - 無法點擊
- 否則正常評分

---

### 案例 3：完整場景展示

```tsx
import RatingScene from "@/components/RatingScene";

export default function RatingDemo() {
  return (
    <RatingScene
      sceneType="teacher"
      sessionId={1}
      answerId={5}
      answererUserId={200}
      answererName="陳同學"
      currentUserId={100}
      currentUserName="王老師"
      existingRating={{
        averageStars: 4.2,
        ratingCount: 5,
      }}
      onRatingSubmitted={() => {
        console.log("評分已提交！");
      }}
    />
  );
}
```

---

## 🔐 防弊機制

### 前端防護

✅ **同組檢測**
```tsx
const isDisabled = (() => {
  if (userRole === "teacher") {
    return false; // 老師可以評分任何人
  }
  // 報告組代表不能對自己評分
  return userGroupId === answererGroupId;
})();
```

- 自動灰掉星星按鈕
- 顯示「無法對自己評分」提示
- 禁用 hover 和 click 事件

### 後端防護

✅ **雙重驗證**（後端 API）

```typescript
// 1. 報告組評分時檢查
if (source === "group_representative") {
  // 取得評分者所在組別
  const raterGroup = await supabase
    .from("group_members")
    .select("group_id")
    .eq("account_id", raterAccountId)
    .single();

  // 取得被評分者所在組別
  const answererGroup = await supabase
    .from("group_members")
    .select("group_id")
    .eq("account_id", answererAccountId)
    .single();

  // 同組即拒絕
  if (raterGroup.group_id === answererGroup.group_id) {
    return 403 "無法對同組成員或自己評分";
  }
}
```

---

## 🎨 UI 反饋

### 成功狀態
```
┌─────────────────────┐
│ ★ ★ ★ ★ ★          │
└─────────────────────┘
    ✓ 已送出
(綠色氣泡 - 2.5 秒後消失)
```

### 禁用狀態
```
☆ ☆ ☆ ☆ ☆ (灰色)
無法對自己評分
```

### 錯誤狀態
```
★ ★ ★ ★ ★
⚠️ 評分失敗，請稍後重試
(紅色警告 - 可點擊重試)
```

### 載入中
```
★ ★ ★ ★ ★
提交中...
(灰掉 50% 透明度)
```

---

## 📊 API 端點

### POST `/api/ratings/submit`

**請求體：**
```json
{
  "sessionId": 1,              // 會議 ID
  "answerId": 5,               // 答題紀錄 ID
  "raterAccountId": 100,       // 評分者 ID
  "star": 5,                   // 評分（1-5）
  "source": "teacher"          // 評分來源：teacher | group_representative
}
```

**成功回應 (201)：**
```json
{
  "success": true,
  "message": "評分已送出",
  "rating": {
    "id": 1,
    "session_id": 1,
    "answer_id": 5,
    "rater_account_id": 100,
    "star": 5,
    "source": "teacher",
    "status": "approved",
    "created_at": "2024-04-29T10:30:00Z"
  }
}
```

**錯誤回應 (400/403/500)：**
```json
{
  "error": "無效的輸入 | 無權限 | 伺服器錯誤"
}
```

**錯誤代碼說明：**
- `400` - 輸入驗證失敗（缺少欄位、星級值無效等）
- `403` - 無權限（同組無法評分）
- `404` - 答題紀錄不存在
- `500` - 伺服器內部錯誤

---

## 🧪 測試

### 運行測試
```bash
npm run test
```

### 測試涵蓋
- ✅ 輸入驗證（缺少欄位、無效星級值）
- ✅ 老師評分權限
- ✅ 報告組防弊機制
- ✅ 成功提交流程

---

## 📱 響應式設計

- **桌面 (>768px)** - 星級大小 2rem
- **行動裝置 (≤768px)** - 星級大小 1.5rem

### 無障礙支持
- ✅ 鍵盤導航（Tab 鍵可聚焦）
- ✅ `:focus-visible` 藍色輪廓
- ✅ ARIA labels (`aria-label`)
- ✅ 減少動畫支持 (`prefers-reduced-motion`)

---

## 🚀 部署檢清單

- [ ] 環境變數已設置
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
- [ ] 數據庫 `ratings` 表已建立
- [ ] `group_members` 表有 `is_leader` 欄位
- [ ] RLS policies 已配置（如使用）
- [ ] 測試通過 ✅
- [ ] 代碼風格符合 CONVENTIONS.md

---

## 📝 相關文檔

- [ARCHITECTURE.md](../../.github/ARCHITECTURE.md) - 系統架構
- [CONVENTIONS.md](../../.github/CONVENTIONS.md) - 代碼規範
- [Sprint3.1](../../.github/Sprint3.1) - 用戶故事

---

## 💡 後續優化

1. **圖表統計**：顯示每題的平均評分分布
2. **評分修改**：允許重新評分且覆蓋前次記錄
3. **批量導出**：匯出評分統計為 CSV/PDF
4. **實時同步**：使用 Supabase Realtime 更新評分
5. **評論功能**：添加定性反饋（文字評論）

