-- Gratitude wall table for named appreciation cards
CREATE TABLE IF NOT EXISTS gratitude_cards (
  id BIGSERIAL PRIMARY KEY,
  sender_account_id BIGINT REFERENCES accounts(id) ON DELETE SET NULL,
  recipient_account_id BIGINT REFERENCES accounts(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gratitude_cards_sender ON gratitude_cards(sender_account_id);
CREATE INDEX IF NOT EXISTS idx_gratitude_cards_recipient ON gratitude_cards(recipient_account_id);
CREATE INDEX IF NOT EXISTS idx_gratitude_cards_created_at ON gratitude_cards(created_at DESC);