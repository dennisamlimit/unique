CREATE TABLE IF NOT EXISTS admin_punishments (
  id SERIAL PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('ban', 'iban', 'jail', 'warn')),
  account_id INTEGER REFERENCES accounts(id) ON DELETE SET NULL,
  character_id INTEGER REFERENCES characters(id) ON DELETE SET NULL,
  target_name TEXT NOT NULL,
  admin_account_id INTEGER REFERENCES accounts(id) ON DELETE SET NULL,
  admin_character_id INTEGER REFERENCES characters(id) ON DELETE SET NULL,
  admin_name TEXT NOT NULL,
  reason TEXT NOT NULL,
  duration_seconds INTEGER NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  lifted_at TIMESTAMPTZ,
  lifted_by_account_id INTEGER REFERENCES accounts(id) ON DELETE SET NULL,
  lifted_by_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS admin_punishments_character_active_idx
  ON admin_punishments(character_id, type, expires_at)
  WHERE lifted_at IS NULL;

CREATE INDEX IF NOT EXISTS admin_punishments_account_active_idx
  ON admin_punishments(account_id, type, expires_at)
  WHERE lifted_at IS NULL;

CREATE INDEX IF NOT EXISTS admin_punishments_created_at_idx
  ON admin_punishments(created_at DESC);

INSERT INTO admin_command_permissions (command, min_level)
VALUES
  ('amsg', 1),
  ('ban', 3),
  ('iban', 5),
  ('jail', 2),
  ('unjail', 2),
  ('warn', 2),
  ('unwarn', 2),
  ('unban', 3)
ON CONFLICT (command) DO NOTHING;

INSERT INTO admin_command_permissions (command, min_level)
VALUES ('logs', 5)
ON CONFLICT (command)
DO UPDATE SET min_level = 5, updated_at = NOW();
