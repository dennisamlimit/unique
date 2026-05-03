ALTER TABLE characters
  ADD COLUMN IF NOT EXISTS is_dead BOOLEAN NOT NULL DEFAULT false;

INSERT INTO admin_command_permissions (command, min_level)
VALUES ('veh', 1)
ON CONFLICT (command) DO NOTHING;
