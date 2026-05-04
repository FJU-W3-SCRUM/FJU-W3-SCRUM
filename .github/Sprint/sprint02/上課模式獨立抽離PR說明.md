# 📋 PR 說明：上課模式完整隔離與穩定性改進

## 🔗 分支資訊
**分支名稱**：`feature/SP2001-classroom-hands-up-extend-v2`  
**合併目標**：`main`

---

## 🎯 本次提交範圍

### **獨立出來的資料夾結構**

```
專案根目錄
├── components/
│   ├── class-mode/                (NEW - 課堂模式前端邏輯)
│   │   ├── ClassModePanel.tsx
│   │   └── client.ts              (統一的 API 包裝)
│   ├── report-mode/               (NEW - 報告模式前端邏輯)
│   │   └── ReportModePanel.tsx
│   ├── ClassModePanel.tsx         (改為 re-export)
│   └── ReportModePanel.tsx        (改為 re-export)
├── lib/
│   └── class-mode/                (NEW - 後端邏輯層)
│       └── server.ts              (session、座位、heartbeat、清理)
├── types/
│   └── classmode.ts               (NEW - 型別定義)
└── app/api/class-mode/            (NEW - 課堂模式 API)
    ├── sessions/route.ts
    └── seats/route.ts
```

## ✨ 主要改動重點

| 區域 | 說明 |
|------|------|
| **功能隔離** | class-mode 與 report-mode 完全分開，避免合併衝突 |
| **前端 Helper** | `components/class-mode/client.ts` 統一 API 呼叫 |
| **後端邏輯** | `lib/class-mode/server.ts` 集中商業邏輯、資料庫查詢 |
| **型別定義** | `types/classmode.ts` 獨立型別，便於維護 |
| **穩定性機制** | Heartbeat + 自動清理，防止課堂懸掛 |

## 🔍 合併時的檢查清單

### ✅ 衝突檢查
- [ ] 若 main 已修改 `components/ClassModePanel.tsx` 或 `ReportModePanel.tsx`，會產生衝突
  - **解法**：保持這兩個檔案為簡單的 re-export，實作都在 `class-mode/` 內

### ✅ API 路徑驗證
- [ ] `/api/class-mode/sessions` 路由存在且功能正常
- [ ] `/api/class-mode/seats` 路由存在且功能正常  
- [ ] `/api/hands-up/update-session` 已支援 `heartbeat_action` 事件

### ✅ 資料庫檢查
- [ ] **不需要新增表欄位** — heartbeat 用既有 `operation_logs` 表記錄
- [ ] 課堂清理基於 `sessions` 表現有的 `starts_at` / `ends_at` / `status` 欄位

### ✅ 測試驗證
- [ ] `pnpm exec tsc --noEmit` ✅ 無型別錯誤
- [ ] `pnpm test -- --run` ✅ 所有測試通過
- [ ] 手動測試：老師啟動課堂流程
- [ ] 手動測試：關掉瀏覽器後 heartbeat 停止，等候 30 分鐘確認課堂自動清理

## 📌 建議合併步驟

1. **本地測試**：`pnpm test -- --run` 與 `pnpm exec tsc --noEmit`
2. **手動驗證**：從課堂模式首頁啟動課堂 → 進入課堂頁面
3. **穩定性測試**：關掉瀏覽器，驗證 heartbeat 停止與課堂清理
4. **合併到 main**

## ⚙️ 後續維護提示

| 項目 | 位置 | 說明 |
|------|------|------|
| Heartbeat 逾時時間（30 分鐘） | `lib/class-mode/server.ts` | 可根據運營需求調整 `timeoutMinutes` |
| Heartbeat 發送間隔（15 秒） | `app/sessions/[session_id]/page.tsx` | 可根據網路狀況調整 |
| 操作日誌大小 | `operation_logs` 表 | 定期檢視，考慮舊紀錄清理策略 |

## 👥 檔案所有權建議

- **`components/class-mode/`** → 上課模式負責人
- **`components/report-mode/`** → 報告模式負責人  
- **`lib/class-mode/`** → 共用邏輯，上課模式負責人維護
- **`app/api/class-mode/`** → API 路由，與前端同步

---

**文件建立日期**：2026-05-04
