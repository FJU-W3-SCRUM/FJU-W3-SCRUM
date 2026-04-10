# 課堂即時互動評分系統 - Database Table Schema

# 2️⃣ 資料庫 Table Schema

## ✅ 設計原則

- 支援歷史紀錄
- 可擴充班級/課堂/角色
- 評分與行為分離紀錄
  
---  

## 設計說明

- 關聯式資料庫設計（MySQL / PostgreSQL 皆適用）
- 支援多班級、多堂課、多角色
- 行為（舉手、回答）與評分紀錄分離
- 所有關鍵操作皆可追蹤歷史紀錄

---

## 1. 使用者與身分管理

### accounts

| 欄位名稱 | 型別 | 說明 |
|---|---|---|
| student_no | VARCHAR(50) (PK) | 學號 / 登入帳號（唯一識別碼） |
| name | VARCHAR(100) | 姓名 |
| email | VARCHAR(255) | 聯絡信箱（選填） |
| password_hash | VARCHAR(255) | 密碼雜湊（僅在使用本系統驗證時） |
| role | ENUM('teacher','student','admin') | 系統角色（可擴充） |
| status | ENUM('active','inactive','suspended') | 帳號狀態 |
| created_at | DATETIME | 建立時間 |
| updated_at | DATETIME | 更新時間 |

Notes:
- `student_no` 應加上唯一索引以避免重複匯入造成不一致。
- `role` 可由老師在課堂或 session 層級覆寫（見 `session_roles`）。

---

## 2. 班級與成員

### classes

| 欄位名稱 | 型別 | 說明 |
|---|---|---|
| id | BIGINT (PK) | 班級 ID |
| class_name | VARCHAR(100) | 班級名稱 |
| year | INT | 學年度 |
| teacher_id | BIGINT (FK) | 老師 account.id |
| created_at | DATETIME | 建立時間 |

---

### ~~class_members~~

> 暫時用於座位表呈顯，TODO

| 欄位名稱 | 型別 | 說明 |
|---|---|---|
| id | BIGINT (PK) | ID |
| class_id | BIGINT (FK) | 班級 ID |
| seat_row | INT | 座位列 (row) |
| seat_col | INT | 座位行 (col) |
| student_no | VARCHAR(50) (FK) | 學號 / 登入帳號 |
| name | VARCHAR(100) | 姓名 |
| created_at | DATETIME | 建立時間 |

✅ 用於呈現「座位矩陣」

---

## 3. 課堂（Session）

### sessions

| 欄位名稱 | 型別 | 說明 |
|---|---|---|
| id | BIGINT (PK) | 課堂 ID |
| class_id | BIGINT (FK) | 班級 ID |
| title | VARCHAR(100) | 課堂名稱 |
| max_point | INT | 本堂課最高可得分 |
| qna_open | BOOLEAN | Q&A 是否開放 |
| status | ENUM('draft','open','closed') | 課堂狀態（決定 UI 行為） |
| starts_at | DATETIME | 課堂開始時間 |
| ends_at | DATETIME | 課堂結束時間 |
| created_at | DATETIME | 建立時間 |

Notes:
- 新增 `status` 與時間欄位便於前端 UI 控制（例如「舉手」按鈕的 disabled 行為）。

---

## 4. 分組管理

### groups

| 欄位名稱 | 型別 | 說明 |
|---|---|---|
| id | BIGINT (PK) | 組別 ID |
| class_id | BIGINT (FK) | 班級 ID |
| group_name | VARCHAR(100) | 報告組名稱 |

---

### group_members

| 欄位名稱 | 型別 | 說明 |
|---|---|---|
| id | BIGINT (PK) | ID |
| group_id | BIGINT (FK) | 組別 ID |
| student_no | VARCHAR(50) (FK) | 學號 / 登入帳號 |
| is_leader | BOOLEAN | 是否為組長 |
| created_at | DATETIME | 建立時間 |

---

### session_groups

| 欄位名稱 | 型別 | 說明 |
|---|---|---|
| id | BIGINT (PK) | ID |
| session_id | BIGINT (FK) | 課堂 ID |
| group_id | BIGINT (FK) | 本堂課報告組 |

---

## 5. Q&A 舉手與回答紀錄

### hand_raises

| 欄位名稱 | 型別 | 說明 |
|---|---|---|
| id | BIGINT (PK) | 舉手紀錄 ID |
| session_id | BIGINT (FK) | 課堂 ID |
| student_no | VARCHAR(50) (FK) | 學號 / 登入帳號 |
| raised_at | DATETIME | 舉手時間 |
| is_selected | BOOLEAN | 是否被點名 |

✅ 用於統計：

- 舉手次數
- 是否曾被點名

---

### answers

| 欄位名稱 | 型別 | 說明 |
|---|---|---|
| id | BIGINT (PK) | 回答紀錄 ID |
| session_id | BIGINT (FK) | 課堂 ID |
| student_no | VARCHAR(50) (FK) | 回答學號 / 登入帳號 |
| answered_at | DATETIME | 回答時間 |

Notes:
- 若需要記錄回答內容或回放，可以增加 `content` 或 `recording_url` 欄位。

✅ 用於統計「實際回答次數」

---

## 6. 回答評分（星等制）

### ratings

| 欄位名稱 | 型別 | 說明 |
|---|---|---|
| id | BIGINT (PK) | 評分 ID |
| session_id | BIGINT (FK) | 課堂 ID |
| answer_id | BIGINT (FK) | 回答紀錄 |
| rater_account_id | BIGINT (FK) | 評分者（報告組代表） |
| star | TINYINT | 星等 (1~5) |
| created_at | DATETIME | 評分時間 |

Suggested improvements:
- 增加 `source` 欄位: `ENUM('teacher','group_representative')` 以區分評分者身分來源。
- 建議在資料庫層面加入複合唯一索引 `(answer_id,rater_account_id)` 以避免重複評分（若業務允許）。
- 若採「暫存/審核」流程，加入 `status` ENUM('draft','submitted','approved','rejected') 與 `submitted_at`、`approved_by` 與 `approved_at` 欄位。

---

## 7. 課堂總分（可調整）

### session_scores

| 欄位名稱 | 型別 | 說明 |
|---|---|---|
| id | BIGINT (PK) | ID |
| session_id | BIGINT (FK) | 課堂 ID |
| student_no | VARCHAR(50) (FK) | 學號 / 登入帳號 |
| total_point | INT | 系統計算分數 |
| adjusted_point | INT | 老師調整後分數 |
| adjusted_by | BIGINT (FK) | 調整者（老師） |
| adjusted_at | DATETIME | 調整時間 |

Notes:
- 建議保留 `total_point`（由系統計算）與 `adjusted_point`（老師最終分），並在 `session_scores` 上加入 `last_updated_by`、`last_updated_at` 做稽核。

✅ 保留「系統分」與「教師最終分」

---

## 8. 可擴充建議（Optional）

### 新增建議表格（依 UserStory 與 spec 需求）

- `session_roles`：每堂課的角色指派（例如本堂誰為 `group_leader`、誰為 `presenter`）。
	- 欄位：`id, session_id, account_id, role, assigned_by, assigned_at`

- `group_quotas`：記錄每個報告組每周（或每場）可用的配分額度。
	- 欄位：`id, group_id, week_start, total_quota, remaining_quota, created_at, updated_at`

- `points_transactions`：記錄所有給分操作（包含暫存、送出、審核、核准／拒絕），可用於防弊與還原。 
	- 欄位：`id, session_id, answer_id (nullable), account_id (被給分者), group_id (nullable), issuer_account_id, issuer_type ENUM('teacher','group_representative'), points INT, status ENUM('pending','approved','rejected'), reason TEXT, created_at, processed_at, processed_by`

- `import_jobs`：匯入學生名單的紀錄，支援原子性失敗回滾與錯誤行號回報。
	- 欄位：`id, file_name, uploaded_by, status ENUM('pending','processing','success','failed'), error_line INT (nullable), error_message TEXT (nullable), created_at, completed_at`

- `operation_logs`：操作稽核，紀錄所有重要操作以利審計（eg. 修改分數、變更配額、匯入名單）。
	- 欄位：`id, account_id (nullable), action_type VARCHAR, resource_type VARCHAR, resource_id BIGINT (nullable), payload JSON, ip_address VARCHAR, created_at`

- `seat_history`：座位變動追蹤（若日後採座位登記功能）。
	- 欄位：`id, class_id, account_id, previous_row, previous_col, new_row, new_col, changed_by, changed_at`

Rationale:
- `group_quotas` 與 `points_transactions` 支援 UserStory 中「報告組每週配額 15 P」與「暫存／審核」流程。
- `import_jobs` 支援 CSV 原子性匯入（全失敗或全成功）與錯誤行號回報驗收條件。
- `operation_logs` 支援完整稽核要求（誰做了什麼、何時、在哪個資源）。

---

## Schema 關聯摘要（更新）

- account → class_members → classes
- classes → sessions → session_groups → groups
- sessions → session_roles → accounts (臨時角色覆寫)
- students → hand_raises / answers → ratings → points_transactions
- groups → group_quotas → points_transactions
- import_jobs、operation_logs、seat_history 作為輔助稽核 / 作業表

``
