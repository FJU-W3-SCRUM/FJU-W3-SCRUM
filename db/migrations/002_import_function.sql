-- Function to import accounts atomically from JSONB array
CREATE OR REPLACE FUNCTION import_accounts(rows JSONB, uploaded_by BIGINT)
RETURNS TABLE(success BOOLEAN, error_line INT, error_message TEXT, imported_count INT)
LANGUAGE plpgsql AS $$
DECLARE
  i INT := 0;
  r JSONB;
  v_student_no TEXT;
  v_name TEXT;
  v_email TEXT;
  v_class_id TEXT;
  acct_id BIGINT;
BEGIN
  IF rows IS NULL OR jsonb_typeof(rows) <> 'array' THEN
    RAISE EXCEPTION 'Input must be JSON array';
  END IF;

  FOR i IN 0..jsonb_array_length(rows)-1 LOOP
    r := rows->i;
    v_student_no := r->>'student_no';
    v_name := r->>'name';
    v_email := r->>'email';
    v_class_id := r->>'class_id';

    IF v_student_no IS NULL OR v_name IS NULL OR trim(v_student_no) = '' OR trim(v_name) = '' THEN
      RAISE EXCEPTION 'Missing required fields at row %', i+1;
    END IF;

    -- prevent duplicate student_no
    IF EXISTS (SELECT 1 FROM accounts WHERE student_no = v_student_no) THEN
      RAISE EXCEPTION 'Duplicate student_no at row %: %', i+1, v_student_no;
    END IF;

    INSERT INTO accounts(student_no, name, email, role, status, created_at, updated_at)
    VALUES (v_student_no, v_name, v_email, 'student', 'active', now(), now())
    RETURNING id INTO acct_id;

    IF v_class_id IS NOT NULL AND trim(v_class_id) <> '' THEN
      INSERT INTO class_members(class_id, account_id, created_at)
      VALUES (v_class_id::BIGINT, acct_id, now());
    END IF;
  END LOOP;

  INSERT INTO import_jobs(file_name, uploaded_by, status, created_at, completed_at)
    VALUES ('api_upload', uploaded_by, 'success', now(), now());

  RETURN QUERY SELECT TRUE, NULL::INT, NULL::TEXT, jsonb_array_length(rows)::INT;
EXCEPTION WHEN OTHERS THEN
  -- record failure and rollback
  INSERT INTO import_jobs(file_name, uploaded_by, status, error_line, error_message, created_at, completed_at)
    VALUES ('api_upload', uploaded_by, 'failed', i+1, SQLERRM, now(), now());
  RETURN QUERY SELECT FALSE, i+1, SQLERRM, 0;
END;
$$;
