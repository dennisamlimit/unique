DELETE FROM admin_command_permissions
WHERE command IN ('money', 'bank', 'coins', 'adminmenu');

INSERT INTO admin_command_permissions (command, min_level)
VALUES
  ('admin', 1),
  ('heal', 1),
  ('revive', 1),
  ('setadmin', 1),
  ('addcash', 1),
  ('setcash', 1),
  ('addbank', 1),
  ('setbank', 1),
  ('adduniquecoins', 1),
  ('setuniquecoins', 1),
  ('noclip', 1)
ON CONFLICT (command) DO NOTHING;
