## SP2002 多班級 Account_ID 修復完成

**修復日期**: 2025年
**影響**: 解決同一學號在不同班級舉手失效的問題
**狀態**: ✅ 已實現、已編譯、已驗證

---

## 問題詳述

### 根本原因
資料庫設計允許同一學號 (student_no) 在不同班級 (class_id) 中有多筆記錄：

```
accounts 表
- id=211, student_no=414155259, class_id=6
- id=186, student_no=414155259, class_id=3
```

登入時系統從 localStorage 獲取 account_id = 211，但當學生進入 class_id=3 的課堂後，舉手操作仍使用 account_id=211（對應的是 class_id=6），導致舉手無反應。

### 症狀
- 學生選擇班級#3進入課堂
- 舉手按鈕點擊無反應
- 查看資料庫：手舉記錄被寫到班級#6的學生賬戶（account_id=211）

---

## 修復方案

### 1. 新增 API 端點
**檔案**: `app/api/auth/get-account-id-by-class/route.ts`

```typescript
GET /api/auth/get-account-id-by-class?student_no=414155259&class_id=3
返回: { account_id: 186, student_no: 414155259, name: "...", class_id: 3 }
```

功能：根據學號和班級ID查詢該學生在該班級對應的account_id

### 2. 修改 Session 初始化
**檔案**: `app/sessions/[session_id]/page.tsx` > useEffect

修改流程：
```typescript
// 步驟1：獲取課堂 overview 數據
const overview = await fetch(/api/hands-up/overview?session_id=${session_id})
// 包含 class_id 在返回數據中

// 步驟2：如果是學生身份
if (currentUser && !canManage && data.class_id) {
  // 步驟3：查詢該課堂對應的 account_id
  const result = await fetch(
    /api/auth/get-account-id-by-class?
    student_no=${currentUser.student_no}&
    class_id=${data.class_id}
  )
  
  // 步驟4：更新為正確的 account_id
  setCurrentUserAccountId(result.account_id)
}
```

### 3. 依賴項確認
- ✅ Overview API 已返回 `class_id`
- ✅ 條件檢查：`!canManage` 確保只對學生進行修正
- ✅ 錯誤處理：查詢失敗時回退到原有 account_id

---

## 驗證清單

- [x] 新增 API 端點 `/api/auth/get-account-id-by-class`
- [x] 修改 SessionPage useEffect
- [x] 編譯成功（0 errors）
- [x] 所有舊功能保持正常
- [x] 文檔更新完成

---

## 預期效果

### 修復前
```
User: student_no=414155259, login account_id=211 (class_id=6)
進入課堂: class_id=3
舉手: 記錄到 account_id=211 ❌ (錯誤的班級)
結果: 班級#3 中看不到舉手 ❌
```

### 修復後
```
User: student_no=414155259
進入課堂: class_id=3
查詢: 根據 student_no + class_id=3 → account_id=186
舉手: 記錄到 account_id=186 ✅ (正確班級)
結果: 班級#3 中正常顯示舉手 ✅
```

---

## 適用範圍

此修復適用於所有具有以下特徵的系統：
- 使用 Supabase PostgreSQL
- 實現多班級/多部門/多租戶架構
- 需要基於上下文正確映射用戶身份

---

## 後續維護

如果發現相關問題，請檢查：
1. Overview API 是否正確返回 `class_id`
2. 新 API `/api/auth/get-account-id-by-class` 是否可正常查詢
3. SessionPage 中是否正確調用新 API 並更新 currentUserAccountId
4. 瀏覽器控制台中的修正日誌：`[SessionPage] 更正 account_id: 211 → 186`
