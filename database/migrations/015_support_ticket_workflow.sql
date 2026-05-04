ALTER TABLE support_tickets
  ADD COLUMN IF NOT EXISTS assigned_admin_account_id INTEGER REFERENCES accounts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assigned_admin_name TEXT,
  ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS escalated_to_level INTEGER;

CREATE TABLE IF NOT EXISTS support_ticket_messages (
  id SERIAL PRIMARY KEY,
  ticket_id INTEGER NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  author_character_id INTEGER REFERENCES characters(id) ON DELETE SET NULL,
  author_account_id INTEGER REFERENCES accounts(id) ON DELETE SET NULL,
  author_name TEXT NOT NULL,
  author_role TEXT NOT NULL DEFAULT 'player',
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS support_ticket_messages_ticket_id_idx ON support_ticket_messages(ticket_id);
