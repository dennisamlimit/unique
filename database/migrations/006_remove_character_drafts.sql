DELETE FROM characters WHERE is_draft = true;

SELECT setval(
  pg_get_serial_sequence('characters', 'id'),
  COALESCE((SELECT MAX(id) FROM characters), 1),
  EXISTS(SELECT 1 FROM characters)
);
