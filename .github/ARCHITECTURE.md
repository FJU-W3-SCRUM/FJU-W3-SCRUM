# 架構與資料模型

> 這份檔案定義了數據的「骨架」，是 Copilot 撰寫 API 與資料讀取邏輯的唯一依據。

## 系統架構

### 大局觀
- **前端框架**：Next.js 16.1.6（App Router）
- **打包工具**：Turbopack（預設）+ Webpack（備用）
- **後端服務**：Supabase（Auth + Supabase）
- **部署平台**：Vercel

### 技術棧
```
┌─────────────────────────────────┐
│      Next.js App Router         │
│  (Turbopack + HMR at 490ms)     │
├─────────────────────────────────┤
│   Supabase Client Library       │
│  (Auth + Supabase + Storage)    │
├─────────────────────────────────┤
│    Supabase Backend Services    │
│  (Cloud Functions + Security)   │
└─────────────────────────────────┘
```

## 關鍵檔案與元件

### 核心初始化
-- **`src/SupabaseClient.js`**：supabase 初始化、認證工具、Firestore 匯出
  - 匯出：`auth`、`db`、`signInWithGoogle`、`signOutUser`、`useEmulator`
  - 不使用本地 supabase 模擬器（單元測試改用 mock）

### Next.js 應用結構
-- **`src/app/Layout.jsx`**：根布局（文檔外殼）
  - 設定網站語言：`zh-Hant`（繁體中文）
  - 包含全域樣式和主應用外殼

-- **`src/app/Page.jsx`**：首頁
  - 提供連結到 `/test-list` 路由
-- **`src/app/test-list`**：路由資料夾範例
  - 路由檔案（App Router）通常為資料夾與 `Page.jsx`，例如 `src/app/test-list/Page.jsx`。
  - 為遵守元件命名慣例，建議將可重用的 React 元件命名為 PascalCase 並放在同一資料夾內，例如 `src/app/TestList.jsx`，由 `Page.jsx` 匯入並包裝。
  - 如需細節，請參閱 `.github/CONVENTIONS.md` 中的命名慣例（元件 PascalCase、工具函式 camelCase）。

-- **`src/app/test-list/Layout.jsx`**：嵌套布局
  - ⚠️ **限制**：禁止渲染 `<html>` 或 `<body>` 標籤

### 樣式與設計
-- **`src/styles/Globals.css`**：全域樣式
  - CSS 變數定義（色票、圓角、間距）
  - 響應式斷點：1024px / 768px / 480px
  - 無障礙 `:focus-visible` 樣式
  - 配色方案来自 ClassCue

### 配置檔案
- **`supabase.json`**：supabase 託管與 Firestore 配置
  - `hosting.public` 指向 `dist` 目錄
  
- **`.supabaserc`**：supabase 專案配置
  
- **`next.config.cjs`**：Webpack 備用配置
  - 別名化 `undici: false`（避免伺服器模組在客戶端打包中）
  
- **`.mcprc`**：MCP 伺服器配置（supabase MCP 整合）

## 資料模型

### 簡易組別選取功能

此專案新增一個輕量功能供教學示範：學生在前端頁面選擇組別，老師可在另一頁看到各組別已被選取情況。

- **路由**：
  - `GET /select-group`：學生選組頁面（`src/app/select-group/Page.jsx`）
  - `GET /teacher/groups`：老師總覽頁面（`src/app/teacher/groups/Page.jsx`）

- **建議元件**：
  - `src/components/GroupSelector.jsx`：展示組別清單並執行選取動作

- **Firestore 集合**：`groupSelections`（或 `selections`）
  - 文件（每次選取一筆）欄位：
    - `groupId` (string)
    - `studentId` (string)
    - `studentName` (string)
    - `createdAt` (timestamp)

- **行為**：
  - 學生按下「加入」時，前端寫入新的 selection 文件。
  - 老師頁面可使用即時 listener 或查詢聚合（group by `groupId`）顯示每組人數與成員概覽。

- **測試**：
  - 單元測試使用 `vi.mock()` 存根 Firestore（測試檔：`__tests__/SelectGroup.test.jsx`）。
  - E2E 測試（Playwright）：`e2e/SelectGroup.spec.js`（模擬學生選取並驗證老師視圖更新）。

### 1. Firestore 集合結構

### 2. 資料流

#### 即時同步機制

#### 狀態管理策略

### 3. 資料庫操作

#### 讀取與寫入
- **讀取**：使用 `useEmulator` 函式根據環境變數切換本地或雲端 Firestore
- **寫入**：單元測試透過 `vi.mock()` 模擬 Firestore，避免實際資料庫操作

### 4. 認證（supabase Auth）

#### 提供者配置
- **OAuth 提供者**：Google OAuth
- **匯出函式**：
  - `signInWithGoogle()`：啟動 Google 帳戶登入流程
  - `signOutUser()`：登出當前已認證用戶
  - `auth`：supabase Auth 實例，用於檢查當前用戶狀態

### 5. 環境變數設定

環境變數與快速上手命令已集中紀錄於專案慣例文件，請參閱 `.github/CONVENTIONS.md`（包含 `NEXT_PUBLIC_*` 範例與 `.env.local` 設定步驟）。

### 測試與模擬

測試與模擬器的慣例（包含 `vi.mock()` 使用、測試檔案位置、以及 Playwright 設定）詳見 `.github/CONVENTIONS.md`；該文件為測試規範的權威來源，這裡僅保留高階說明與工作流程連結。

若需要快速執行指令或檢視測試檔案範例，也可參閱專案根目錄的 `README.md`（快速開始），但測試慣例與細節請以 `.github/CONVENTIONS.md` 為主。

## 資料流

### 讀取流程
```
Page/Component
    ↓
useEmulator() / supabase Firestore
    ↓
Test Collection Document
    ↓
Component State/Props
    ↓
Render
```

### 認證流程
```
User Click "Sign In with Google"
    ↓
signInWithGoogle()
    ↓
supabase Auth Provider
    ↓
Google OAuth Dialog
    ↓
auth.currentUser Updated
    ↓
Component Re-render
```

## 開發工作流綜合圖

```
npm install
    ↓
Copy .env.example → .env.local
    ↓
npm run dev (Turbopack)
    ↓
http://localhost:3000
    ↓
Edit Code → HMR Updates (~490ms)
    ↓
npm run test (Vitest with mocks)
    ↓
npx playwright test (E2E)
    ↓
npm run build
    ↓
npm run deploy (supabase Hosting)
```

## supabase MCP 伺服器

- **用途**：為 Copilot / Claude 提供 supabase 操作能力
- **啟動**：`npm run mcp:start` 或指定專案目錄 `npm run mcp:start:with-dir`
- **配置**：參考 `supabase_MCP_SETUP.md`
  - **配置**：參考 `supabase_MCP_SETUP.md`（注意：倉庫中可能尚未加入此檔案，若為空引用請補齊或移除引用）。
