-- Migration: Create score query function
-- Purpose: Query student scores per SP3004 specification

CREATE OR REPLACE FUNCTION query_student_scores(
  p_class_id INTEGER DEFAULT NULL,
  p_session_id INTEGER DEFAULT NULL,
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
  session_id INTEGER,
  title TEXT,
  created_at TIMESTAMPTZ,
  raise_count BIGINT,
  answer_count BIGINT,
  total_score NUMERIC
) AS $$
WITH TP_ClassGrpMembers AS (
  -- 取得班級、組別、學生基本資料
  SELECT 
    A.id AS class_id,
    A.class_name,
    B.group_name,
    D.id AS student_id,
    D.student_no,
    D.name,
    CASE WHEN C.is_leader IS TRUE THEN '組長' ELSE '' END AS group_leader
  FROM classes A
  LEFT JOIN groups B ON A.id = B.class_id
  LEFT JOIN group_members C ON B.id = C.group_id
  INNER JOIN accounts D ON A.id = D.class_id AND C.student_no = D.student_no
  WHERE D.role = 'student'
    AND (p_class_id IS NULL OR A.id = p_class_id)
    AND (p_keyword IS NULL OR D.student_no ILIKE '%' || p_keyword || '%' OR D.name ILIKE '%' || p_keyword || '%')
),
TP_RaiseCount AS (
  -- 計算舉手次數與被點回答次數
  SELECT 
    session_id,
    account_id,
    COUNT(account_id) AS raise_count,
    SUM(CASE WHEN status = 'A' THEN 1 ELSE 0 END) AS answer_count
  FROM hand_raises
  WHERE (p_session_id IS NULL OR session_id = p_session_id)
  GROUP BY session_id, account_id
),
TP_AnswerScore AS (
  -- 計算評點分數
  SELECT 
    A.session_id,
    A.account_id,
    SUM(B.star) AS score
  FROM answers A
  INNER JOIN ratings B 
    ON A.session_id = B.session_id AND A.id = B.answer_id
  WHERE B.status = 'approved'
    AND (p_session_id IS NULL OR A.session_id = p_session_id)
  GROUP BY A.session_id, A.account_id
)
SELECT 
  A.class_id,
  A.class_name,
  A.group_name,
  A.student_id,
  A.student_no,
  A.name,
  A.group_leader,
  B.id AS session_id,
  B.title,
  B.created_at,
  COALESCE(C.raise_count, 0) AS raise_count,
  COALESCE(C.answer_count, 0) AS answer_count,
  COALESCE(D.score, 0)::NUMERIC AS total_score
FROM TP_ClassGrpMembers A
INNER JOIN sessions B ON A.class_id = B.class_id
LEFT JOIN TP_RaiseCount C 
  ON B.id = C.session_id AND A.student_id = C.account_id
LEFT JOIN TP_AnswerScore D 
  ON B.id = D.session_id AND A.student_id = D.account_id
WHERE 1 = 1
  AND (p_class_id IS NULL OR A.class_id = p_class_id)
  AND (p_session_id IS NULL OR B.id = p_session_id)
ORDER BY 
  A.class_id,
  A.group_name,
  A.group_leader DESC,
  A.student_no,
  B.id;
$$ LANGUAGE SQL STABLE;

-- Grant access to authenticated users
GRANT EXECUTE ON FUNCTION query_student_scores TO authenticated;
GRANT EXECUTE ON FUNCTION query_student_scores TO service_role;
