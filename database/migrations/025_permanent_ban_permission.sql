INSERT INTO admin_command_permissions (command, min_level)
VALUES ('uniban', 7)
ON CONFLICT (command)
DO UPDATE SET min_level = 7, updated_at = NOW();
