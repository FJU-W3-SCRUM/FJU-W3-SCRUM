-- Migration: 003_ratings_schema
-- Purpose: Ensure ratings table has all necessary fields for star rating system
-- This migration is idempotent and can be run multiple times safely

-- Ensure ratings table exists with complete schema
CREATE TABLE IF NOT EXISTS ratings (
  id BIGSERIAL PRIMARY KEY,
  session_id BIGINT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  answer_id BIGINT NOT NULL REFERENCES answers(id) ON DELETE CASCADE,
  rater_account_id BIGINT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  star SMALLINT NOT NULL CHECK (star BETWEEN 1 AND 5),
  source VARCHAR(32) NOT NULL DEFAULT 'teacher',
  status VARCHAR(16) NOT NULL DEFAULT 'approved',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (session_id, answer_id, rater_account_id) -- 防止重複評分
);

-- 建立索引以加速查詢
CREATE INDEX IF NOT EXISTS idx_ratings_session_id ON ratings(session_id);
CREATE INDEX IF NOT EXISTS idx_ratings_answer_id ON ratings(answer_id);
CREATE INDEX IF NOT EXISTS idx_ratings_rater_account_id ON ratings(rater_account_id);
CREATE INDEX IF NOT EXISTS idx_ratings_source ON ratings(source);
CREATE INDEX IF NOT EXISTS idx_ratings_created_at ON ratings(created_at);

-- 建立複合索引用於統計查詢
CREATE INDEX IF NOT EXISTS idx_ratings_session_source ON ratings(session_id, source);

-- 確保 group_members 表有 is_leader 欄位
ALTER TABLE group_members
ADD COLUMN IF NOT EXISTS is_leader BOOLEAN DEFAULT FALSE;

-- 建立索引用於組別查詢
CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_account_id ON group_members(account_id);
CREATE INDEX IF NOT EXISTS idx_group_members_is_leader ON group_members(is_leader);

-- 設置行級安全性策略（RLS）
-- 如果使用 Supabase RLS，請啟用此段

ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;

-- 只允許認證用戶讀取評分
CREATE POLICY IF NOT EXISTS "Authenticated users can read ratings"
  ON ratings
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- 只允許認證用戶插入自己的評分
CREATE POLICY IF NOT EXISTS "Users can only insert their own ratings"
  ON ratings
  FOR INSERT
  WITH CHECK (auth.uid()::bigint = rater_account_id);

-- 註解：實際部署時需要根據業務邏輯調整 RLS 策略
