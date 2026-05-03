INSERT INTO admin_command_permissions (command, min_level)
VALUES
  ('dim', 1),
  ('setdim', 1),
  ('msg', 1)
ON CONFLICT (command) DO NOTHING;
