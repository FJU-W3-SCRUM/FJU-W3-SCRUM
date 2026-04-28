# SP2002 TDD 開發實現計劃

## 📋 測試結構概覽

### Task01: 報告模式分數呈現
**文件:** `__tests__/sprint-sp2002/task01-student-score.test.ts`

#### 核心服務接口
```typescript
interface StudentScoreData {
  account_id: string;
  student_no: string;
  name: string;
  answerCount: number;      // 被點發表次數 (status='A')
  raiseCount: number;        // 舉手次數 (總計)
  totalScore: number;        // 評點分數
}

interface StudentScoreService {
  getStudentScoresForSession(sessionId: string): Promise<StudentScoreData[]>;
  getStudentScoreForSession(sessionId: string, accountId: string): Promise<StudentScoreData>;
}
```

#### 測試用例
- ✅ 獲取課堂所有學生的發言統計
- ✅ 計算 answerCount (status='A' 的記錄)
- ✅ 計算 raiseCount (所有舉手記錄)
- ✅ 計算 totalScore (ratings.star 加總)
- ✅ UI 格式化 (name (學號)<組長> (answer/raise; score))

---

### Task02: 分數查詢功能
**文件:** `__tests__/sprint-sp2002/task02-score-query.test.ts`

#### 核心服務接口
```typescript
interface StudentScoreQueryResult {
  class_id: string;
  class_name: string;
  session_id: string;
  session_title: string;
  account_id: string;
  student_no: string;
  name: string;
  raiseCount: number;
  answerCount: number;
  totalScore: number;
}

interface ScoreQueryService {
  queryScores(
    userId: string,
    userRole: 'admin' | 'student',
    filters: ScoreQueryFilters
  ): Promise<StudentScoreQueryResult[]>;
  
  getTeacherClasses(teacherId: string): Promise<Array<{ id: string; name: string }>>;
  getStudentClasses(studentId: string): Promise<Array<{ id: string; name: string }>>;
}
```

#### 測試用例
**老師角色:**
- ✅ 查詢所有班別的所有學生成績
- ✅ 按班別篩選
- ✅ 按學號或姓名關鍵字查詢
- ✅ 同時使用班別和關鍵字查詢
- ✅ 班別 Dropdown 列出所有班別

**學生角色:**
- ✅ 只能查詢同班成績
- ✅ 班別 Dropdown 只列出自己的班別
- ✅ 按關鍵字查詢同班學生
- ✅ 無法查詢其他班別

**結果處理:**
- ✅ 包含所有必要欄位
- ✅ 按課堂時間排序
- ✅ 無結果返回空陣列

---

## 🔧 下一步實現

### 1️⃣ 數據層 - Database Queries
需要實現的 SQL 查詢函數 (建議放在 `lib/supabase/queries/`)

#### Task01 相關查詢
```typescript
// lib/supabase/queries/student-scores.ts

// 查詢課堂內所有學生的統計
export async function getStudentScoresForSession(supabase, sessionId: string)

// 查詢單一學生的統計
export async function getStudentScoreForSession(supabase, sessionId: string, accountId: string)
```

**需要 Join 的表:**
- `hand_raises` - 舉手記錄 (answerCount, raiseCount)
- `ratings` - 評分記錄 (totalScore)
- `accounts` - 學生信息 (student_no, name)

#### Task02 相關查詢
```typescript
// lib/supabase/queries/score-query.ts

export async function queryStudentScores(
  supabase,
  userId: string,
  userRole: 'admin' | 'student',
  classId?: string,
  keyword?: string
): Promise<StudentScoreQueryResult[]>
```

### 2️⃣ 服務層 - Business Logic
實現兩個服務文件 (建議放在 `lib/services/`)

```typescript
// lib/services/student-score-service.ts
// lib/services/score-query-service.ts
```

### 3️⃣ API 層 - Routes
新建或修改 API 端點

```typescript
// app/api/scores/student-scores/route.ts
// GET: /api/scores/student-scores?sessionId=xxx&accountId=xxx

// app/api/scores/query/route.ts  
// GET: /api/scores/query?classId=xxx&keyword=xxx
```

### 4️⃣ UI 層 - Components
- 修改 `components/ReportModePanel.tsx` 顯示分數 (Task01)
- 新建 `components/ScoreQueryPanel.tsx` (Task02)

---

## 📊 數據庫設計要點

### 必要的 Supabase 表結構
1. **hand_raises** - 需要有以下欄位:
   - `session_id` - 課堂 ID
   - `account_id` - 學生 ID
   - `status` - 狀態 ('R'=舉手, 'A'=被點, 'D'=放下, 'C'=已清, etc.)

2. **ratings** - 需要有以下欄位:
   - `hand_raise_id` - 關聯舉手記錄
   - `star` - 顆星分數 (1-5 或其他)

3. **sessions** - 需要有以下欄位:
   - `id` - 課堂 ID
   - `class_id` - 班級 ID
   - `title` - 課堂名稱

4. **classes** - 班級信息
5. **accounts** - 帳號信息

---

## 🧪 測試運行

### 執行 Task01 測試
```bash
npm test -- task01-student-score.test.ts
```

### 執行 Task02 測試
```bash
npm test -- task02-score-query.test.ts
```

### 執行所有 Sprint02 測試
```bash
npm test -- sprint-sp2002/
```

---

## ⚡ 開發順序建議

1. **先實現 Task01** (更簡單，沒有權限邏輯)
   - 數據層查詢
   - 服務層邏輯
   - API 端點
   - UI 修改

2. **再實現 Task02** (包含權限控制)
   - 數據層查詢 (含權限過濾)
   - 服務層邏輯 (含角色判斷)
   - API 端點
   - UI 頁面

---

## 💾 文件清單

### 待創建的文件
- [ ] `lib/supabase/queries/student-scores.ts` - Task01 數據查詢
- [ ] `lib/supabase/queries/score-query.ts` - Task02 數據查詢
- [ ] `lib/services/student-score-service.ts` - Task01 業務邏輯
- [ ] `lib/services/score-query-service.ts` - Task02 業務邏輯
- [ ] `app/api/scores/student-scores/route.ts` - Task01 API
- [ ] `app/api/scores/query/route.ts` - Task02 API
- [ ] `components/ScoreQueryPanel.tsx` - Task02 UI

### 待修改的文件
- [ ] `components/ReportModePanel.tsx` - 添加分數顯示

---

## 📝 編譯檢查

運行測試前先確保 TypeScript 編譯無誤:
```bash
npm run build
```
