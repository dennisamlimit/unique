ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS admin_level INTEGER NOT NULL DEFAULT 0 CHECK (admin_level BETWEEN 0 AND 10);

UPDATE accounts
SET admin_level = 10
WHERE id = (SELECT MIN(id) FROM accounts)
  AND admin_level = 0;

CREATE TABLE IF NOT EXISTS admin_command_permissions (
  command TEXT PRIMARY KEY,
  min_level INTEGER NOT NULL DEFAULT 1 CHECK (min_level BETWEEN 1 AND 10),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO admin_command_permissions (command, min_level)
VALUES
  ('heal', 1),
  ('revive', 1),
  ('money', 1),
  ('bank', 1),
  ('coins', 1),
  ('setadmin', 1),
  ('noclip', 1),
  ('adminmenu', 1)
ON CONFLICT (command) DO NOTHING;
