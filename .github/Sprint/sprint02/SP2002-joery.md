# 報告組模式
舉手老師/報告組頁優化
- 基本功能參考：[SP2001-joery.md](SP2001-joery.md "SP2001-joery.md")

> 請依以下規格需求執行生成程式，
> 採TDD，先寫測試角本於 __tests__/sprint-sp2002/ 下
> 再依架構開發

## ISUUE-切換報告組別問題

### **User Story:**
當老師在『報告模式』，切換報告組別時，所有人的畫面應呈現為預設初始化畫面:
- 有舉手的人應為放下狀態,舉手佇列清空
- 開放舉手回到初始:關閉(未開放狀態)，對應畫面顯示UI,如下:
  - Q&A開放中->Q&A已關閉 狀態
  - 舉手功能"我要舉手" -> 未開放狀態
- 原本報告組之組長權限有控制重整為正確權限,若切換報告組別則應為非報告組
  - 角色權限參考 [SP2001-joery.md/#報告模式各角色權限](SP2001-joery.md#報告模式各角色權限)
  - 開始報告(button)、開放舉手(button)、放下所有舉手(button)、點名(button)，這些為報告組長的權限要變成非報告組  
- 目前報告組別切換為老師指定組別

---


## 需求-SP2002

### 參考資料表 
> 詳細資料表欄位參考 [TableSchema資料表](../../TableSchema.md)

- [A]:sessions - 課堂（Session）
- [B]:hand_raises - Q&A 舉手與回答紀錄
- [C]:answers - 回答記錄,用於統計：舉手次數、是否曾被點名
- [D]:ratings - 回答評分（星等制)

---
  
### **User Story:** 
身為 教師 (Admin) 我想要 自動記錄每位學生在每堂課的發言次數 因此我可以 依即時數據作為評分參考，避免資源過度集中。

> [X] 目前已有功能並將資料分別記錄在資料表了，以下重新分析為需要執行之Task

### 驗收條件
- **\[正向路徑\] 自動計次：**
- **Given:** 學生發言獲點。
- **Then:** 系統在後台自動將該生該堂課發言數 +1，並同步更新至老師端監控畫面。

### Spec 說明
#### Task01 報告模式中呈現分數
在報告模式分組名單中，在最右邊顯示資料ex: `林小明 (414100259)<組長>     (1/3; 0) ` 
- 資料說明
(`{answer_cnt}`/`{raise_count}`; `{score}`)
依本次課堂[sessions].id、學生之學號/ID，查詢[hand_raises]
| 名稱 | 說明 | 對應欄位 |  其他備註 |
|------|:----:|---------|-------------|
| `{answer_cnt}` | 被點發表次數 | [hand_raises].account_id; WHERE status='A' | 同課堂,計算次數 |
| `{raise_count}` | 舉手次數 | [hand_raises].account_id | 同課堂,計算次數 |
| `{score}` | 評點分數 | [ratings].star | 加總分數;被評顆星分數 |

#### 參考SQL

##### SQL- 被點發表次數 `{answer_cnt}`

```SQL
-- 計算被點發表次數/回答次數
SELECT session_id, account_id, COUNT(account_id) AS answer_cnt
FROM hand_raises
WHERE 1 = 1
--AND raised_at >=  CAST('2026-04-28' AS timestamp) -- 不用此條件,該為測試查資料使用
AND status = 'A'
AND session_id = 85  -- {session_id}
GROUP BY session_id, account_id
ORDER BY session_id DESC, account_id ASC
;
```

##### SQL-舉手次數 `{raise_count}`

```SQL
-- 計算舉手次數
SELECT session_id, account_id, COUNT(account_id) AS raise_count
FROM hand_raises
WHERE 1 = 1
--AND raised_at >=  CAST('2026-04-28' AS timestamp) -- 不用此條件,該為測試查資料使用
AND session_id = 85  -- {session_id}
GROUP BY session_id, account_id
ORDER BY session_id DESC, account_id ASC
;
```

##### SQL-評點分數 `{score}`

```SQL
-- 計算評點分數
SELECT A.session_id, A.account_id, SUM(B.star) AS score
FROM answers A
INNER JOIN ratings B
ON A.session_id = B.session_id
AND A.id = B.answer_id
WHERE 1 = 1
--AND raised_at >=  CAST('2026-04-28' AS timestamp) -- 不用此條件,該為測試查資料使用
AND A.session_id = 85  -- {session_id}
GROUP BY A.session_id, A.account_id
ORDER BY A.session_id DESC, A.account_id ASC
;
```

---

#### Task02 另新增一功能查詢所有人分數統計別
在左邊功能表中，新增一功能『分數查詢』，所有角色都可以使用，但老師、學生有不同查詢權限
進入後在UI控制  

- 書面呈現，使用現有Layout,程式畫面上半部為查詢條件區，下半部為查詢結果列表
  - 條詢條件：
  | 名稱 | 元件 | 對應欄位 | 說明 |
  |------|:----:|---------|-------------|
  | 班別 | DropdownList | | 列出老師所有班別 |
  | 學生 | TextBox | [accounts].student_no/name | 關鍵字查詢 |
    
  - 結果列表：
  | 名稱 | 對應欄位 | 說明 | 其他備註 |
  |------|:----:|---------|-------------|
  | 班別 | [classes].class_name | 顯示班級名稱 |  |
  | 課堂 | [sessions].(class_id)title |  |  |
  | 學生學號 | [accounts].student_no | 學號 | |
  | 學生姓名 | [accounts].name | 姓名 | |
  | 舉手次數 | [hand_raises].account_id | 同課堂,計算次數, | |
  | 被點發表次數 | [hand_raises].account_id | 同課堂,計算次數 | status='A' |
  | 評點分數 | [ratings].star | 被評顆星分數 | |

- 老師角色：
  - 可以查詢所有人成績

- 學生角色：
  - 只能查詢同班的成績，指『班別DropdownList』只會列出自己有的班別


---

## issue-SP2002-Task01

```prompt
參考 @{} 以下逐一修改，修改完成後修改對應task, 畫押為完成 [ ]-> [X]

```

- 報告模式』
  - [X] 執行 "放下所有舉手"，組員最右方的舉手及分數顯示未顯示或需要一陣時間才顯示
        > 是否還可優化同步速度更即時更快
  - [X] "結束課堂"時，請轉頁到index首頁
  - [X] 如果直接執行url sessions/{session_id}，若該課堂已結束則不允許再進入        
        > ex:http://localhost:3000/sessions/85  
        > 課堂結束判斷 When status = 'closed' OR ends_at IS NOT NULL
  - [X] 進入報告模式選擇課堂時，把 session_id 加在課堂名稱後,ex: 課堂title(session_id)
  - [X] 若為老師角色,除了原本老師可以建立課堂功能外，再這功能上方也加入學生角色進入時可以選擇課堂的畫面
        > 若老師不小心登出，可以重新進入報告模式
  - [X] 資料表[sessions].status狀態值:ENUM('draft','open','closed') ，請分析系統上使用的狀態,修改為對的
    - [X] 老師建立課堂時應為:`open`，結束課堂時為:`closed`


  
// 1. 查詢 student_no 對應的所有 class_id（可能多筆）
const { data: accounts } = await supabase
  .from('accounts')
  .select('class_id')
  .eq('student_no', student_no);  // ← 支援多筆記錄

const classIds = accounts.map(a => a.class_id).filter(Boolean);

// 2. 取得這些班級的所有進行中課堂
const { data: sessions } = await supabase
  .from('sessions')
  .select('...')
  .in('class_id', classIds)  // ← 檢索所有班級
  .not('starts_at', 'is', null)
  .is('ends_at', null);

// 3. 對每個班級只保留最新課堂
const latestSessionsMap: Record<number, any> = {};
sessions.forEach((s) => {
  const classId = s.class_id;
  if (!latestSessionsMap[classId] || s.id > latestSessionsMap[classId].id) {
    latestSessionsMap[classId] = s;  // ← 每班級保留最新
  }
});


## SP2001-Task01-issue-2acctRaiseIssue

✅ **已修復**

該問題為資料表[accounts]在不同的班別class_id裡有相同的 student_no
- 例如 student_no=414155259 在 class_id=6 和 class_id=3 中各有一條記錄（account_id 分別為 211 和 186）
- 進入課堂時沒有根據該課堂的 class_id 查詢正確的 account_id，導致舉手記錄到錯誤的賬戶

### 修復方案

**修改位置：** [app/sessions/[session_id]/page.tsx](../../50_Project/CLASS-HANDS-UP/app/sessions/[session_id]/page.tsx)

在初始化 Session 時，進行以下步驟：
1. 獲取課堂的 overview 數據（包含 class_id）
2. 對於學生身份用戶，根據 `student_no + class_id` 重新查詢正確的 account_id
3. 更新 currentUserAccountId 為正確值

**新增 API：** `/api/auth/get-account-id-by-class`
- 根據 student_no 和 class_id 查詢該學生在該班級對應的 account_id
- 解決同一學號在不同班級有不同 account_id 的問題

### 完整流程

```
學生進入課堂
  ↓
SessionPage 加載，獲取 overview 數據（包含 class_id）
  ↓
如果用戶是學生，調用 GET /api/auth/get-account-id-by-class?student_no=414155259&class_id=3
  ↓
查詢結果：account_id=186（這是該學生在 class_id=3 中的正確ID）
  ↓
更新 currentUserAccountId = 186
  ↓
之後所有舉手、評分等操作都使用正確的 account_id=186
```

### 驗證

該修復確保：
- ✅ 同一學號在不同班級時使用正確的 account_id
- ✅ 舉手記錄到正確的課堂
- ✅ 分數統計準確
- ✅ 點名評分綁定正確的學生

## SP2002-BugFix-AnswersSchemaError

✅ **已修復**

### 問題描述
老師、報告組長點名同學評分功能出錯：
```
評分失敗: Failed to create answer: Could not find the 'hand_raise_id' column of 'answers' in the schema cache
```

### 根本原因
在 `/api/hands-up/rate` 端點中，試圖在 answers 表插入不存在的欄位 `hand_raise_id`。

根據資料庫架構，answers 表的欄位為：
- id (PK)
- session_id (FK)
- account_id (FK) - 回答學生 ID
- answered_at (TIMESTAMP)
- content (TEXT)

不應包含 `hand_raise_id`。

### 修復方案
**修改檔案：** `/app/api/hands-up/rate/route.ts`

移除在 insert 時寫入的 `hand_raise_id: hand_raise_id || null` 行：

```typescript
// 修復前
const { data: answerData, error: answerError } = await supabase
  .from('answers')
  .insert({
    session_id,
    account_id: target_account_id,
    content: '口頭回答 (Oral Response)',
    hand_raise_id: hand_raise_id || null  // ❌ 移除
  })

// 修復後
const { data: answerData, error: answerError } = await supabase
  .from('answers')
  .insert({
    session_id,
    account_id: target_account_id,
    content: '口頭回答 (Oral Response)'
  })
```

### 驗證
- ✅ 編譯成功 (0 errors)
- ✅ answers 表只使用實際存在的欄位
- ✅ TableSchema.md 已更新

## SP2002-BugFix-TeacherRaterAccountIdFK

✅ **已修復**

### 問題描述
老師評分時出錯：
```
評分失敗: insert or update on table "ratings" violates foreign key constraint "ratings_rater_account_id_fkey"
```

### 根本原因
`rater_account_id` 指向一個在 accounts 表中不存在的 ID。通常發生在：
1. 老師沒有在該班級的 accounts 表中被註冊
2. 或者老師的 account_id 無效

### 修復方案

**方案 1：Rate API 驗證** (`/app/api/hands-up/rate/route.ts`)
- 在插入 rating 前驗證 `rater_account_id` 是否存在於 accounts 表
- 如果不存在，將 `rater_account_id` 設為 NULL（允許評分但不記錄具體評分者）
- 這樣老師可以正常評分，即使他們沒有在該班級被註冊

**方案 2：SessionPage 查詢** (`/app/sessions/[session_id]/page.tsx`)
- 為老師添加初始化邏輯，進入課堂時查詢該班級的 teacher_id
- 新增 API `/api/auth/get-teacher-account-id`，根據 class_id 返回該班級的老師 account_id
- 自動使用有效的 teacher_account_id，而不是登入時的可能無效的 ID

**新增 API：** `/api/auth/get-teacher-account-id`
```typescript
GET /api/auth/get-teacher-account-id?class_id=1
返回: { teacher_account_id: 42, teacher_name: "王老師" }
或: { teacher_account_id: null, teacher_name: null } // 如果班級未設置老師
```

### 完整流程

**老師進入課堂時：**
```
1. 取得課堂資訊（包含 class_id）
2. 查詢 GET /api/auth/get-teacher-account-id?class_id=3
3. 如果找到 teacher_account_id，使用該值
4. 如果未找到，保留原有 account_id（rate API 會驗證並設為 NULL）
5. 點名評分時，使用有效的 rater_account_id 或 NULL
```

### 驗證
- ✅ 編譯成功 (0 errors)
- ✅ Rate API 增加驗證邏輯
- ✅ SessionPage 為老師新增 account_id 查詢
- ✅ 新增 get-teacher-account-id API
- ✅ 允許 rater_account_id 為 NULL 作為備用方案