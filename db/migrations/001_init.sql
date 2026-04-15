-- Initial schema based on .github/TableSchema.md
-- Postgres-compatible DDL

-- accounts
CREATE TABLE IF NOT EXISTS accounts (
  id BIGSERIAL PRIMARY KEY,
  student_no VARCHAR(50) NOT NULL,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255),
  password_hash VARCHAR(255),
  role VARCHAR(32) NOT NULL DEFAULT 'student',
  status VARCHAR(16) NOT NULL DEFAULT 'active',
  class_id BIGINT REFERENCES classes(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- classes
CREATE TABLE IF NOT EXISTS classes (
  id BIGSERIAL PRIMARY KEY,
  class_name VARCHAR(100) NOT NULL,
  year INT,
  teacher_id BIGINT REFERENCES accounts(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- class_members (seat matrix)
CREATE TABLE IF NOT EXISTS class_members (
  id BIGSERIAL PRIMARY KEY,
  class_id BIGINT REFERENCES classes(id) ON DELETE CASCADE,
  account_id BIGINT REFERENCES accounts(id) ON DELETE CASCADE,
  seat_row INT,
  seat_col INT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (class_id, account_id)
);

-- sessions (one per lesson)
CREATE TABLE IF NOT EXISTS sessions (
  id BIGSERIAL PRIMARY KEY,
  class_id BIGINT REFERENCES classes(id) ON DELETE CASCADE,
  title VARCHAR(100),
  max_point INT DEFAULT 0,
  qna_open BOOLEAN DEFAULT FALSE,
  status VARCHAR(16) DEFAULT 'draft',
  starts_at TIMESTAMP WITH TIME ZONE,
  ends_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- groups and group_members
CREATE TABLE IF NOT EXISTS groups (
  id BIGSERIAL PRIMARY KEY,
  class_id BIGINT REFERENCES classes(id) ON DELETE CASCADE,
  group_name VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS group_members (
  id BIGSERIAL PRIMARY KEY,
  group_id BIGINT REFERENCES groups(id) ON DELETE CASCADE,
  account_id BIGINT REFERENCES accounts(id) ON DELETE CASCADE,
  is_leader BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (group_id, account_id)
);

-- session_groups (which group reports this session)
CREATE TABLE IF NOT EXISTS session_groups (
  id BIGSERIAL PRIMARY KEY,
  session_id BIGINT REFERENCES sessions(id) ON DELETE CASCADE,
  group_id BIGINT REFERENCES groups(id) ON DELETE CASCADE
);

-- hand raises and answers
CREATE TABLE IF NOT EXISTS hand_raises (
  id BIGSERIAL PRIMARY KEY,
  session_id BIGINT REFERENCES sessions(id) ON DELETE CASCADE,
  account_id BIGINT REFERENCES accounts(id) ON DELETE CASCADE,
  raised_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  is_selected BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS answers (
  id BIGSERIAL PRIMARY KEY,
  session_id BIGINT REFERENCES sessions(id) ON DELETE CASCADE,
  account_id BIGINT REFERENCES accounts(id) ON DELETE CASCADE,
  answered_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  content TEXT
);

-- ratings
CREATE TABLE IF NOT EXISTS ratings (
  id BIGSERIAL PRIMARY KEY,
  session_id BIGINT REFERENCES sessions(id) ON DELETE CASCADE,
  answer_id BIGINT REFERENCES answers(id) ON DELETE CASCADE,
  rater_account_id BIGINT REFERENCES accounts(id) ON DELETE SET NULL,
  star SMALLINT CHECK (star BETWEEN 1 AND 5),
  source VARCHAR(32) DEFAULT 'group_representative',
  status VARCHAR(16) DEFAULT 'approved',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- session_scores
CREATE TABLE IF NOT EXISTS session_scores (
  id BIGSERIAL PRIMARY KEY,
  session_id BIGINT REFERENCES sessions(id) ON DELETE CASCADE,
  account_id BIGINT REFERENCES accounts(id) ON DELETE CASCADE,
  total_point INT DEFAULT 0,
  adjusted_point INT,
  adjusted_by BIGINT REFERENCES accounts(id) ON DELETE SET NULL,
  adjusted_at TIMESTAMP WITH TIME ZONE,
  last_updated_by BIGINT REFERENCES accounts(id) ON DELETE SET NULL,
  last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (session_id, account_id)
);

-- session_roles (per-session overrides/assignments)
CREATE TABLE IF NOT EXISTS session_roles (
  id BIGSERIAL PRIMARY KEY,
  session_id BIGINT REFERENCES sessions(id) ON DELETE CASCADE,
  account_id BIGINT REFERENCES accounts(id) ON DELETE CASCADE,
  role VARCHAR(32) NOT NULL,
  assigned_by BIGINT REFERENCES accounts(id) ON DELETE SET NULL,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (session_id, account_id, role)
);

-- group_quotas
CREATE TABLE IF NOT EXISTS group_quotas (
  id BIGSERIAL PRIMARY KEY,
  group_id BIGINT REFERENCES groups(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  total_quota INT DEFAULT 0,
  remaining_quota INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (group_id, week_start)
);

-- points_transactions
CREATE TABLE IF NOT EXISTS points_transactions (
  id BIGSERIAL PRIMARY KEY,
  session_id BIGINT REFERENCES sessions(id) ON DELETE SET NULL,
  answer_id BIGINT REFERENCES answers(id) ON DELETE SET NULL,
  account_id BIGINT REFERENCES accounts(id) ON DELETE CASCADE,
  group_id BIGINT REFERENCES groups(id) ON DELETE SET NULL,
  issuer_account_id BIGINT REFERENCES accounts(id) ON DELETE SET NULL,
  issuer_type VARCHAR(32) DEFAULT 'group_representative',
  points INT NOT NULL,
  status VARCHAR(16) DEFAULT 'approved',
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  processed_at TIMESTAMP WITH TIME ZONE
);

-- import_jobs
CREATE TABLE IF NOT EXISTS import_jobs (
  id BIGSERIAL PRIMARY KEY,
  file_name VARCHAR(255),
  uploaded_by BIGINT REFERENCES accounts(id) ON DELETE SET NULL,
  status VARCHAR(16) DEFAULT 'pending',
  error_line INT,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- operation_logs
CREATE TABLE IF NOT EXISTS operation_logs (
  id BIGSERIAL PRIMARY KEY,
  account_id BIGINT REFERENCES accounts(id) ON DELETE SET NULL,
  action_type VARCHAR(100),
  resource_type VARCHAR(100),
  resource_id BIGINT,
  payload JSONB,
  ip_address VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- seat_history
CREATE TABLE IF NOT EXISTS seat_history (
  id BIGSERIAL PRIMARY KEY,
  class_id BIGINT REFERENCES classes(id) ON DELETE CASCADE,
  account_id BIGINT REFERENCES accounts(id) ON DELETE CASCADE,
  previous_row INT,
  previous_col INT,
  new_row INT,
  new_col INT,
  changed_by BIGINT REFERENCES accounts(id) ON DELETE SET NULL,
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_hand_raises_session_at ON hand_raises (session_id, raised_at);
CREATE INDEX IF NOT EXISTS idx_answers_session_at ON answers (session_id, answered_at);
