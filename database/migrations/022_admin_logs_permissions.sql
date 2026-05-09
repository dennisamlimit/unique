CREATE TABLE IF NOT EXISTS admin_logs (
  id SERIAL PRIMARY KEY,
  admin_account_id INTEGER REFERENCES accounts(id) ON DELETE SET NULL,
  admin_character_id INTEGER REFERENCES characters(id) ON DELETE SET NULL,
  admin_name TEXT NOT NULL,
  command TEXT NOT NULL,
  raw_args TEXT NOT NULL DEFAULT '',
  details TEXT,
  success BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS admin_logs_created_at_idx ON admin_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS admin_logs_command_idx ON admin_logs(command);

INSERT INTO admin_command_permissions (command, min_level)
VALUES
  ('permissions', 10),
  ('logs', 1)
ON CONFLICT (command) DO NOTHING;
