INSERT INTO admin_command_permissions (command, min_level)
VALUES
  ('tmute', 1),
  ('tunmute', 1)
ON CONFLICT (command) DO NOTHING;
