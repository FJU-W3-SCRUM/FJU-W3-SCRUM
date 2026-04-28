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
