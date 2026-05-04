INSERT INTO admin_command_permissions (command, min_level)
VALUES
  ('dl', 1),
  ('delveh', 1)
ON CONFLICT (command) DO NOTHING;
