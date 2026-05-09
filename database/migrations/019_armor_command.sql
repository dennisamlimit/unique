INSERT INTO admin_command_permissions (command, min_level)
VALUES
  ('armor', 1)
ON CONFLICT (command) DO NOTHING;
