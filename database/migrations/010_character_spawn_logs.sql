CREATE TABLE IF NOT EXISTS character_spawn_logs (
  id SERIAL PRIMARY KEY,
  character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  spawn_type TEXT NOT NULL,
  position JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS character_spawn_logs_character_created_idx
  ON character_spawn_logs(character_id, created_at DESC);
