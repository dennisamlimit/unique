CREATE TABLE IF NOT EXISTS accounts (
  id SERIAL PRIMARY KEY,
  social_club_id TEXT NOT NULL UNIQUE,
  social_club_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  unique_coins INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS characters (
  id SERIAL PRIMARY KEY,
  account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  slot INTEGER NOT NULL CHECK (slot BETWEEN 1 AND 3),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  level INTEGER NOT NULL DEFAULT 1,
  bank_balance INTEGER NOT NULL DEFAULT 1500,
  cash INTEGER NOT NULL DEFAULT 500,
  position JSONB NOT NULL DEFAULT '{"x": -1037.71, "y": -2737.89, "z": 20.17, "heading": 328.0}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (account_id, slot)
);

CREATE INDEX IF NOT EXISTS characters_account_id_idx ON characters(account_id);
