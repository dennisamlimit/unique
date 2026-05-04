WITH ranked_open_tickets AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY character_id
      ORDER BY updated_at DESC, created_at DESC, id DESC
    ) AS row_number
  FROM support_tickets
  WHERE status <> 'closed'
)
UPDATE support_tickets
SET status = 'closed', updated_at = NOW()
WHERE id IN (
  SELECT id
  FROM ranked_open_tickets
  WHERE row_number > 1
);

CREATE UNIQUE INDEX IF NOT EXISTS support_tickets_one_open_per_character_idx
  ON support_tickets(character_id)
  WHERE status <> 'closed';
