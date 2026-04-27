# GEMINI.md - 課堂即時互動評分系統 (Class Hands Up)

## 專案概述 (Project Overview)
本專案是一個基於 Next.js 與 Supabase 的課堂即時互動評分系統。旨在提供老師於課堂進行報告、Q&A 舉手互動、即時評分與歷史紀錄分析。

- **核心目標**：視覺化班級座位表，即時同步學生舉手狀態，並由老師或報告組進行點名與評分。
- **技術架構**：
  - **前端框架**：Next.js 16 (App Router)
  - **後端服務**：Supabase (Authentication, PostgreSQL Database, Realtime)
  - **樣式工具**：Tailwind CSS 4
  - **測試框架**：Vitest (單元測試), Playwright (E2E 測試)
  - **部署平台**：Vercel

## 關鍵技術與檔案 (Key Technologies & Files)
- **Supabase Client (`lib/supabase/client.ts`)**:
  - `supabase`: 匿名 (anon) 客戶端，用於前端互動（遵循 RLS）。
  - `supabaseAdmin`: 管理員 (service role) 客戶端，用於伺服器端 API 或需要權限的操作。
- **App Router (`app/`)**:
  - `app/api/`: 包含帳號管理、分組、舉手互動、匯入等 API 路由。
  - `app/sessions/`: 課堂互動核心頁面。
- **即時同步 (`hooks/useHandsUpSync.ts`)**: 利用 Supabase Realtime 處理舉手狀態同步。

## 開發與執行 (Building and Running)
### 常用指令
- `npm run dev`: 啟動開發伺服器
- `npm run build`: 專案編譯
- `npm run start`: 啟動編譯後的生產環境
- `npm run lint`: 執行 ESLint 檢查
- `npm run test`: 執行 Vitest 單元測試

### 環境變數
請參考 `.env.example` 並於本地建立 `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase 專案 URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase 匿名 Key
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase 管理員 Key (伺服器端專用)

## 開發規範 (Development Conventions)
請務必遵循 `.github/CONVENTIONS.md` 中的詳細規範：
- **語言慣例**：文件與 UI 以 **繁體中文 (zh-Hant)** 為主。
- **命名慣例**：
  - React 元件/頁面：`PascalCase` (如 `GroupSelector.tsx`)。
  - 工具函式：`camelCase`。
  - 常數：`UPPER_SNAKE_CASE`。
- **元件模式**：
  - 互動、使用 State 或 Supabase 即時功能的元件需標註 `"use client"`。
  - 優先使用 Server Components 進行資料獲取。
- **測試慣例**：
  - 單元測試放在 `__tests__/`，使用 Vitest。
  - 測試時應 mock `lib/supabase/client` 以避免真實 DB 操作。

## 核心功能模組 (Core Modules)
1. **帳號與角色管理**: 匯入學號、判斷角色 (Teacher/Student)。
2. **分組管理**: 建立報告組別、成員分配。
3. **課堂互動 (Hands Up)**: 舉手、點名、推薦人選邏輯。
4. **評分機制**: 1~5 星評分、總分累計。

## 參考文件 (Reference Docs)
- [Architecture & Data Model](.github/ARCHITECTURE.md)
- [Development Conventions](.github/CONVENTIONS.md)
- [System Design Document](.github/spec.md)
