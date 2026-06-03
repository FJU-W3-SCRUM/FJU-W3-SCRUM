WITH TP_ClassGrpMembers AS
(
  SELECT A.id AS class_id, A.class_name, B.group_name, D.id AS student_id, D.student_no, D.name
    ,CASE WHEN C.is_leader IS true THEN '組長' ELSE '' END AS group_leader
  FROM classes A
  LEFT JOIN groups B
  ON A.id = B.class_id
  LEFT JOIN group_members C
  ON B.id = C.group_id
  INNER JOIN accounts D
  ON A.id = D.class_id
  AND C.student_no = D.student_no
  WHERE 1 = 1
  --AND A.id = 8
)
, TP_RaiseCount AS
(
  -- 計算(被點回答/舉手次數)
  SELECT session_id, account_id, COUNT(account_id) AS raise_count
    ,SUM(CASE WHEN status = 'A' THEN 1 ELSE 0 END) AS answer_count
  FROM hand_raises
  WHERE 1 = 1
  --AND raised_at >=  CAST('2026-04-29' AS timestamp) -- 不用此條件,該為測試查資料使用
  --AND session_id = 167  -- {session_id}
  GROUP BY session_id, account_id
  --ORDER BY session_id DESC, account_id ASC
)
, TP_AnswerScore AS
(
  -- 計算評點分數
  SELECT A.session_id, A.account_id, SUM(B.star) AS score
  FROM answers A
  INNER JOIN ratings B
  ON A.session_id = B.session_id
  AND A.id = B.answer_id
  WHERE 1 = 1
  --AND raised_at >=  CAST('2026-04-29' AS timestamp) -- 不用此條件,該為測試查資料使用
  --AND A.session_id IN(90,91,93) -- {session_id}
  GROUP BY A.session_id, A.account_id
)
,TP_StudentScoreDtl AS
(
  SELECT A.*, B.id, B.title, B.created_at
    ,COALESCE(C.raise_count,0) AS raise_count 
    ,COALESCE(C.answer_count,0) AS answer_count 
    ,COALESCE(D.score,0) AS score 
  FROM TP_ClassGrpMembers A
  INNER JOIN sessions B
  ON A.class_id = B.class_id
  LEFT JOIN TP_RaiseCount C
  ON B.id = C.session_id
  AND A.student_id = C.account_id
  LEFT JOIN TP_AnswerScore D
  ON B.id = D.session_id
  AND A.student_id = D.account_id
  WHERE 1 = 1
  AND A.class_id = 8  --{class_id} 班級 ID
  --AND B.id = 167      --{session_id} 課堂 ID
  --AND A.student_no = '414155259'  --{student_no}  學號
  ORDER BY A.class_id ,  A.group_name ,  A.group_leader DESC,  A.student_no, B.id
)

SELECT class_id, class_name, group_name, student_no, name, group_leader
  ,SUM(raise_count) AS raise_count
  ,SUM(answer_count) AS answer_count
  ,SUM(score) AS score
FROM TP_StudentScoreDtl
WHERE 1 = 1
AND class_id = 8  --{class_id} 班級 ID
--AND id = 167      --{session_id} 課堂 ID
--AND student_no = '414155259'  --{student_no}  學號
GROUP BY class_id, class_name, group_name, student_no, name, group_leader
ORDER BY class_id, class_name, group_name, group_leader DESC, student_no