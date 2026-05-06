INSERT INTO admin_command_permissions (command, min_level)
VALUES
  ('mute', 2),
  ('unmute', 2)
ON CONFLICT (command)
DO UPDATE SET min_level = 2, updated_at = NOW();
