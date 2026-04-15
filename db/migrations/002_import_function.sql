-- Function to import accounts from JSONB array, skipping duplicates
CREATE OR REPLACE FUNCTION import_accounts(rows JSONB, uploaded_by BIGINT)
RETURNS TABLE(success BOOLEAN, imported_count INT, duplicate_count INT, detail JSONB)
LANGUAGE plpgsql AS $$
DECLARE
  i INT := 0;
  r JSONB;
  v_student_no TEXT;
  v_name TEXT;
  v_email TEXT;
  v_class_id TEXT;
  acct_id BIGINT;
  imported INT := 0;
  duplicates INT := 0;
  duplicate_details JSONB := '[]'::JSONB;
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
      CONTINUE;
    END IF;

    -- Check if student_no already exists - skip if it does (duplicate)
    IF EXISTS (SELECT 1 FROM accounts WHERE student_no = v_student_no) THEN
      duplicates := duplicates + 1;
      duplicate_details := duplicate_details || jsonb_build_array(jsonb_build_object('row', i+1, 'student_no', v_student_no));
      CONTINUE;
    END IF;

    BEGIN
      INSERT INTO accounts(student_no, name, email, role, status, password_hash, created_at, updated_at)
      VALUES (v_student_no, v_name, v_email, 'student', 'active', v_student_no, now(), now())
      RETURNING id INTO acct_id;
      imported := imported + 1;

      IF v_class_id IS NOT NULL AND trim(v_class_id) <> '' THEN
        INSERT INTO class_members(class_id, account_id, created_at)
        VALUES (v_class_id::BIGINT, acct_id, now());
      END IF;
    EXCEPTION WHEN OTHERS THEN
      -- Log individual errors but continue processing
      CONTINUE;
    END;
  END LOOP;

  INSERT INTO import_jobs(file_name, uploaded_by, status, created_at, completed_at)
    VALUES ('api_upload', uploaded_by, CASE WHEN imported > 0 THEN 'success' ELSE 'completed_with_issues' END, now(), now());

  RETURN QUERY SELECT (imported > 0), imported, duplicates, jsonb_build_object('duplicates', duplicate_details);
EXCEPTION WHEN OTHERS THEN
  INSERT INTO import_jobs(file_name, uploaded_by, status, error_message, created_at, completed_at)
    VALUES ('api_upload', uploaded_by, 'failed', SQLERRM, now(), now());
  RETURN QUERY SELECT FALSE, 0, 0, jsonb_build_object('error', SQLERRM);
END;
$$;
