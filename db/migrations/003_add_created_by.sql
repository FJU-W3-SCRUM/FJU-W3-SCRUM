-- Migration: Add created_by field to sessions table
-- Purpose: Track which user (by student_no) created each session

ALTER TABLE IF EXISTS sessions
ADD COLUMN IF NOT EXISTS created_by VARCHAR(20);

-- Add index for querying sessions by creator
CREATE INDEX IF NOT EXISTS idx_sessions_created_by ON sessions(created_by);

COMMENT ON COLUMN sessions.created_by IS '建立課堂的用戶 student_no';
