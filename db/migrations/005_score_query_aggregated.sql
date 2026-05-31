-- Migration: Create aggregated score query function
-- Purpose: Query aggregated student scores across all sessions for SP3004 specification
-- This function sums up raise_count, answer_count, and total_score across all sessions
-- Used when user selects "全部課堂" (all sessions) in the UI

CREATE OR REPLACE FUNCTION query_student_scores_aggregated(
  p_class_id INTEGER DEFAULT NULL,
  p_keyword TEXT DEFAULT NULL,
  p_user_id TEXT DEFAULT NULL,
  p_user_role TEXT DEFAULT 'student'
)
RETURNS TABLE (
  class_id INTEGER,
  class_name TEXT,
  group_name TEXT,
  student_id INTEGER,
  student_no TEXT,
  name TEXT,
  group_leader TEXT,
  total_raise_count BIGINT,      -- 所有課堂舉手加總
  total_answer_count BIGINT,     -- 所有課堂被點加總
  total_score NUMERIC            -- 所有課堂評分加總
) AS $$
WITH TP_ClassGrpMembers AS (
  -- 取得班級、組別、學生基本資料
  -- 先從班級開始，然後 JOIN 學生，最後 LEFT JOIN 組別信息
  SELECT 
    A.id AS class_id,
    A.class_name,
    COALESCE(B.group_name, '') AS group_name,
    D.id AS student_id,
    D.student_no,
    D.name,
    CASE WHEN C.is_leader IS TRUE THEN '組長' ELSE '' END AS group_leader
  FROM classes A
  INNER JOIN accounts D ON A.id = D.class_id AND D.role = 'student'
  LEFT JOIN group_members C ON D.student_no = C.student_no
  LEFT JOIN groups B ON A.id = B.class_id AND C.group_id = B.id
  WHERE 1 = 1
    AND (p_class_id IS NULL OR A.id = p_class_id)
    AND (p_keyword IS NULL OR D.student_no ILIKE '%' || p_keyword || '%' OR D.name ILIKE '%' || p_keyword || '%')
),
TP_RaiseCount AS (
  -- 計算舉手次數與被點回答次數（跨所有課堂聚合）
  SELECT 
    account_id,
    COUNT(account_id) AS raise_count,
    SUM(CASE WHEN status = 'A' THEN 1 ELSE 0 END) AS answer_count
  FROM hand_raises
  GROUP BY account_id
),
TP_AnswerScore AS (
  -- 計算評點分數（跨所有課堂聚合）
  SELECT 
    A.account_id,
    SUM(B.star) AS score
  FROM answers A
  INNER JOIN ratings B 
    ON A.session_id = B.session_id AND A.id = B.answer_id
  WHERE B.status = 'approved'
  GROUP BY A.account_id
)
SELECT 
  A.class_id,
  A.class_name,
  A.group_name,
  A.student_id,
  A.student_no,
  A.name,
  A.group_leader,
  COALESCE(C.raise_count, 0) AS total_raise_count,
  COALESCE(C.answer_count, 0) AS total_answer_count,
  COALESCE(D.score, 0)::NUMERIC AS total_score
FROM TP_ClassGrpMembers A
LEFT JOIN TP_RaiseCount C 
  ON A.student_id = C.account_id
LEFT JOIN TP_AnswerScore D 
  ON A.student_id = D.account_id
WHERE 1 = 1
  AND (p_class_id IS NULL OR A.class_id = p_class_id)
ORDER BY 
  A.class_id,
  A.group_name,
  A.group_leader DESC,
  A.student_no;
$$ LANGUAGE SQL STABLE;

-- Grant access to authenticated users
GRANT EXECUTE ON FUNCTION query_student_scores_aggregated TO authenticated;
GRANT EXECUTE ON FUNCTION query_student_scores_aggregated TO service_role;
