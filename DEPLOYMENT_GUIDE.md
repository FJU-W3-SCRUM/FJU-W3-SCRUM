# 🚀 星級評分系統 - 部署指南

## 📋 先決條件

- Node.js 18+ 和 npm/yarn/pnpm
- Supabase 帳戶和專案
- VS Code（推薦）

---

## 🔧 安裝步驟

### 1️⃣ 克隆或更新代碼

```bash
# 如果還沒有克隆
git clone <repository-url>
cd FJU-W3-SCRUM

# 或更新現有代碼
git pull origin main
```

### 2️⃣ 安裝依賴

```bash
npm install
```

### 3️⃣ 設置環境變數

創建 `.env.local` 文件：

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
```

**取得這些值的方法：**

1. 登錄 [Supabase Dashboard](https://app.supabase.com/)
2. 選擇你的專案
3. 左側菜單 → Settings → API
4. 複製：
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role secret` → `SUPABASE_SERVICE_ROLE_KEY`

### 4️⃣ 執行數據庫遷移

**使用 Supabase 控制台：**

1. Supabase Dashboard → SQL Editor
2. 複製 [`db/migrations/003_ratings_schema.sql`](./db/migrations/003_ratings_schema.sql) 的內容
3. 貼上並執行

**或使用 CLI：**

```bash
npx supabase db push
```

---

## ✅ 驗證安裝

### 啟動開發服務器

```bash
npm run dev
```

開啟 [http://localhost:3000](http://localhost:3000)

### 查看演示

訪問 [http://localhost:3000/rating-demo](http://localhost:3000/rating-demo)

應該看到：
- ✅ 老師評分演示
- ✅ 報告組評分演示
- ✅ 互動式星級評分組件

### 運行測試

```bash
npm run test
```

應該看到所有測試通過 ✅

---

## 📁 項目結構

```
FJU-W3-SCRUM/
├── app/
│   ├── api/ratings/submit/    # API 路由
│   ├── rating-demo/           # 演示頁面
│   └── ...
├── components/
│   ├── StarRating.tsx         # ★ 核心組件
│   ├── RatingDisplay.tsx      # 統計顯示
│   └── RatingScene.tsx        # 集成示例
├── lib/
│   ├── rating-utils.ts        # 工具函式
│   └── supabase/
├── db/migrations/
│   └── 003_ratings_schema.sql # 數據庫遷移
├── __tests__/
│   ├── api.ratings.test.ts    # 單元測試
│   └── star_rating.integration.test.ts
├── STAR_RATING_*.md           # 文檔
└── package.json
```

---

## 🎯 快速開始

### 方式 1：集成到現有頁面

```tsx
// pages/classroom.tsx
import StarRating from "@/components/StarRating";

export default function Classroom() {
  return (
    <StarRating
      sessionId={1}
      answerId={5}
      currentUserId={100}
      userRole="teacher"
      answererUserId={200}
    />
  );
}
```

### 方式 2：使用完整場景

```tsx
import RatingScene from "@/components/RatingScene";

export default function GradingPage() {
  return (
    <RatingScene
      sceneType="teacher"
      sessionId={1}
      answerId={5}
      answererUserId={200}
      answererName="李同學"
      currentUserId={100}
      currentUserName="王老師"
    />
  );
}
```

### 方式 3：複用演示頁面

直接訪問 [http://localhost:3000/rating-demo](http://localhost:3000/rating-demo) 作為參考

---

## 🐛 常見問題排除

### ❌ 錯誤：`NEXT_PUBLIC_SUPABASE_URL is not defined`

**解決：** 檢查 `.env.local` 是否存在且變數正確

```bash
# 檢查文件是否存在
ls -la .env.local

# 檢查變數
cat .env.local
```

### ❌ 錯誤：`Star rating component doesn't render`

**解決：** 檢查 Supabase 連接

```typescript
// lib/supabase/client.ts
import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
```

### ❌ 錯誤：`POST /api/ratings/submit 返回 500`

**解決：** 檢查數據庫遷移

```bash
# 驗證 ratings 表是否存在
supabase db list

# 查看錯誤日誌
npm run dev # 檢查終端輸出
```

---

## 🧪 測試和驗證

### 單元測試

```bash
npm run test

# 或監視模式
npm run test -- --watch
```

### 集成測試（手動）

1. 開啟演示頁面
2. 嘗試老師評分
3. 嘗試報告組評分
4. 驗證防弊機制

### 生產測試

```bash
# 構建
npm run build

# 啟動生產服務
npm start
```

---

## 📦 部署到生產環境

### 部署到 Vercel（推薦）

```bash
# 登錄 Vercel
npm install -g vercel
vercel

# 輸入環境變數
# NEXT_PUBLIC_SUPABASE_URL
# NEXT_PUBLIC_SUPABASE_ANON_KEY
# SUPABASE_SERVICE_ROLE_KEY
```

### 部署到其他平台

**環境變數設置：**

在你的託管平台（AWS、GCP、Azure 等）中設置：

```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
```

**構建命令：**

```bash
npm install
npm run build
npm start
```

---

## 📊 監控和維護

### 檢查數據庫

```sql
-- 查詢最近的評分
SELECT * FROM ratings ORDER BY created_at DESC LIMIT 10;

-- 評分統計
SELECT 
  answer_id,
  COUNT(*) as total,
  AVG(star) as average,
  source
FROM ratings
GROUP BY answer_id, source;

-- 找出問題評分（同組評分 - 不應該出現）
SELECT * FROM ratings
WHERE source = 'group_representative'
AND id IN (
  SELECT r.id FROM ratings r
  WHERE EXISTS (
    SELECT 1 FROM group_members gm1
    JOIN group_members gm2 ON gm1.group_id = gm2.group_id
    WHERE gm1.account_id = r.rater_account_id
    AND gm2.account_id = (
      SELECT account_id FROM answers WHERE id = r.answer_id
    )
  )
);
```

### 日誌監控

```bash
# 查看應用日誌
npm run dev 2>&1 | grep -i error

# 查看 Supabase 日誌
# Dashboard → Logs → Function / API
```

---

## 🔐 安全檢查清單

- [ ] 永遠不要在公開倉庫中提交 `.env.local`
- [ ] `SUPABASE_SERVICE_ROLE_KEY` 只在伺服器端使用
- [ ] 啟用 Supabase RLS（行級安全性）
- [ ] 定期審查 API 日誌
- [ ] 實施速率限制（可選）

---

## 📞 技術支持

### 查看完整文檔

- [星級評分實現文檔](./STAR_RATING_IMPLEMENTATION.md) - 技術細節
- [快速開始指南](./STAR_RATING_QUICK_START.md) - 使用示例
- [系統架構](./github/ARCHITECTURE.md) - 系統設計

### 常見命令

```bash
# 開發
npm run dev

# 測試
npm run test

# 構建
npm run build

# 啟動生產
npm start

# 代碼檢查
npm run lint
```

### 獲取幫助

1. 查看終端錯誤信息
2. 查看 Supabase 控制台日誌
3. 檢查 [STAR_RATING_QUICK_START.md](./STAR_RATING_QUICK_START.md) 的常見問題

---

## ✨ 驗收檢清表

部署前最後檢查：

- [ ] 開發服務器運行正常
- [ ] `/rating-demo` 頁面正常顯示
- [ ] 所有測試通過
- [ ] 老師可以評分
- [ ] 報告組可以相互評分
- [ ] 防弊機制有效（同組無法評分）
- [ ] 「已送出」氣泡正常顯示
- [ ] 沒有 TypeScript 錯誤
- [ ] 沒有控制台警告
- [ ] 環境變數正確設置
- [ ] 數據庫遷移已執行

---

## 🎉 完成！

一切就緒！你現在可以：

1. 開始在應用中使用星級評分功能
2. 邀請用戶測試
3. 收集反饋並改進
4. 部署到生產環境

祝你使用愉快！🚀

---

**更新日期：** 2024年4月29日
**版本：** 1.0.0
**狀態：** 生產就緒 ✅
