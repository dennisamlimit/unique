import { Pool } from "pg";

let pool: Pool | null = null;

function databaseUrl() {
  return process.env.DATABASE_URL ?? "postgres://unique:unique@postgres:5432/unique";
}

export function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: databaseUrl()
    });
  }

  return pool;
}

export async function initializeDatabase() {
  const client = await getPool().connect();

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS accounts (
        account_id SERIAL PRIMARY KEY,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        social_club_name TEXT,
        social_club_id TEXT UNIQUE,
        password_hash TEXT NOT NULL,
        password_salt TEXT NOT NULL,
        character_created BOOLEAN NOT NULL DEFAULT FALSE,
        birth_date TEXT,
        origin TEXT,
        customization_json TEXT,
        admin_level INTEGER NOT NULL DEFAULT 0,
        cash INTEGER NOT NULL DEFAULT 0,
        bank_cash INTEGER NOT NULL DEFAULT 0,
        health INTEGER NOT NULL DEFAULT 100,
        armor INTEGER NOT NULL DEFAULT 0,
        dimension INTEGER NOT NULL DEFAULT 0,
        pos_x DOUBLE PRECISION NOT NULL DEFAULT -75.24,
        pos_y DOUBLE PRECISION NOT NULL DEFAULT -818.95,
        pos_z DOUBLE PRECISION NOT NULL DEFAULT 326.18,
        rot_z DOUBLE PRECISION NOT NULL DEFAULT 160.0,
        is_banned BOOLEAN NOT NULL DEFAULT FALSE,
        ban_reason TEXT,
        ban_date TEXT,
        ban_expires_at TEXT,
        ban_admin_name TEXT,
        ban_admin_account_id INTEGER NOT NULL DEFAULT 0
      );
    `);

    await client.query("ALTER TABLE accounts ADD COLUMN IF NOT EXISTS ban_date TEXT;");
    await client.query("ALTER TABLE accounts ADD COLUMN IF NOT EXISTS ban_expires_at TEXT;");
    await client.query("ALTER TABLE accounts ADD COLUMN IF NOT EXISTS ban_admin_name TEXT;");
    await client.query("ALTER TABLE accounts ADD COLUMN IF NOT EXISTS ban_admin_account_id INTEGER NOT NULL DEFAULT 0;");

    await client.query(`
      CREATE TABLE IF NOT EXISTS server_spawn (
        spawn_key TEXT PRIMARY KEY,
        pos_x DOUBLE PRECISION NOT NULL,
        pos_y DOUBLE PRECISION NOT NULL,
        pos_z DOUBLE PRECISION NOT NULL,
        rot_z DOUBLE PRECISION NOT NULL,
        dimension INTEGER NOT NULL
      );
    `);

    await client.query(
      `
        INSERT INTO server_spawn (spawn_key, pos_x, pos_y, pos_z, rot_z, dimension)
        VALUES ('default', $1, $2, $3, $4, $5)
        ON CONFLICT (spawn_key) DO NOTHING;
      `,
      [-75.24, -818.95, 326.18, 160.0, 0]
    );

    await client.query(`
      CREATE TABLE IF NOT EXISTS factions (
        faction_id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        short_name TEXT NOT NULL UNIQUE,
        type TEXT NOT NULL,
        color_hex TEXT NOT NULL DEFAULT '#FFFFFF',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS faction_ranks (
        faction_id INTEGER NOT NULL REFERENCES factions(faction_id) ON DELETE CASCADE,
        rank_level INTEGER NOT NULL CHECK (rank_level BETWEEN 1 AND 6),
        rank_name TEXT NOT NULL,
        PRIMARY KEY (faction_id, rank_level)
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS faction_memberships (
        account_id INTEGER NOT NULL REFERENCES accounts(account_id) ON DELETE CASCADE,
        faction_id INTEGER NOT NULL REFERENCES factions(faction_id) ON DELETE CASCADE,
        rank_level INTEGER NOT NULL DEFAULT 1,
        joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (account_id)
      );
    `);
  } finally {
    client.release();
  }
}
