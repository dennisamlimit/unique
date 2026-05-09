ALTER TABLE characters
  ADD COLUMN IF NOT EXISTS admin_level INTEGER NOT NULL DEFAULT 0 CHECK (admin_level BETWEEN 0 AND 10);

WITH first_characters AS (
  SELECT DISTINCT ON (account_id) id, account_id
  FROM characters
  WHERE is_draft = false
  ORDER BY account_id, slot ASC, id ASC
)
UPDATE characters c
SET admin_level = a.admin_level
FROM first_characters fc
JOIN accounts a ON a.id = fc.account_id
WHERE c.id = fc.id
  AND c.admin_level = 0
  AND a.admin_level > 0;
