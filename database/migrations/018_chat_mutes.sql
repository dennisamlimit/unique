CREATE TABLE IF NOT EXISTS chat_mutes (
  id SERIAL PRIMARY KEY,
  character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  muted_by_account_id INTEGER REFERENCES accounts(id) ON DELETE SET NULL,
  muted_by_name TEXT NOT NULL,
  reason TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  lifted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS chat_mutes_character_active_idx
  ON chat_mutes(character_id, expires_at)
  WHERE lifted_at IS NULL;

INSERT INTO admin_command_permissions (command, min_level)
VALUES
  ('mute', 1)
ON CONFLICT (command) DO NOTHING;
