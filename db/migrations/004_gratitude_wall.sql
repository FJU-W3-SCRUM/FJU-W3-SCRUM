-- SP3003: 感謝牆具名投稿
CREATE TABLE IF NOT EXISTS gratitude_wall (
  id BIGSERIAL PRIMARY KEY,
  sender_account_id BIGINT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  recipient_account_id BIGINT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  class_id BIGINT REFERENCES classes(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gratitude_wall_class_id ON gratitude_wall(class_id);
CREATE INDEX IF NOT EXISTS idx_gratitude_wall_sender ON gratitude_wall(sender_account_id);
CREATE INDEX IF NOT EXISTS idx_gratitude_wall_recipient ON gratitude_wall(recipient_account_id);
