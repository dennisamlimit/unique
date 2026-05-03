ALTER TABLE characters
  ADD COLUMN IF NOT EXISTS is_draft BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS characters_account_draft_idx ON characters(account_id, is_draft);
