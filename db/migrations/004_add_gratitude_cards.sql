-- Migration: Add gratitude cards for named appreciation wall (US 4.1)

CREATE TABLE IF NOT EXISTS gratitude_cards (
  id BIGSERIAL PRIMARY KEY,
  session_id BIGINT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  sender_account_id BIGINT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  recipient_account_id BIGINT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT gratitude_cards_message_not_empty CHECK (char_length(trim(message)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_gratitude_cards_session_created_at
  ON gratitude_cards (session_id, created_at DESC);
