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
        phone_number VARCHAR(15),
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
        map_icon_id INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await client.query("ALTER TABLE factions ADD COLUMN IF NOT EXISTS map_icon_id INTEGER NOT NULL DEFAULT 0;");
    await client.query("ALTER TABLE factions ALTER COLUMN map_icon_id SET DEFAULT 0;");
    await client.query("ALTER TABLE factions ADD COLUMN IF NOT EXISTS balance BIGINT NOT NULL DEFAULT 100000;");

    await client.query(`
      CREATE TABLE IF NOT EXISTS faction_ranks (
        faction_id INTEGER NOT NULL REFERENCES factions(faction_id) ON DELETE CASCADE,
        rank_level INTEGER NOT NULL CHECK (rank_level BETWEEN 1 AND 20),
        rank_name TEXT NOT NULL,
        PRIMARY KEY (faction_id, rank_level)
      );
    `);

    await client.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.constraint_column_usage
          WHERE table_name = 'faction_ranks'
            AND constraint_name = 'faction_ranks_rank_level_check'
        ) THEN
          ALTER TABLE faction_ranks DROP CONSTRAINT faction_ranks_rank_level_check;
        END IF;
      EXCEPTION
        WHEN undefined_object THEN NULL;
      END $$;
    `);
    await client.query(`
      DO $$
      BEGIN
        ALTER TABLE faction_ranks ADD CONSTRAINT faction_ranks_rank_level_check CHECK (rank_level BETWEEN 1 AND 20);
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$;
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

    await client.query(`
      CREATE TABLE IF NOT EXISTS faction_rank_permissions (
        faction_id INTEGER NOT NULL REFERENCES factions(faction_id) ON DELETE CASCADE,
        rank_level INTEGER NOT NULL,
        permission_key TEXT NOT NULL,
        PRIMARY KEY (faction_id, rank_level, permission_key),
        FOREIGN KEY (faction_id, rank_level) REFERENCES faction_ranks(faction_id, rank_level) ON DELETE CASCADE
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS faction_spawn_points (
        faction_id INTEGER PRIMARY KEY REFERENCES factions(faction_id) ON DELETE CASCADE,
        pos_x DOUBLE PRECISION NOT NULL,
        pos_y DOUBLE PRECISION NOT NULL,
        pos_z DOUBLE PRECISION NOT NULL,
        rot_z DOUBLE PRECISION NOT NULL,
        dimension INTEGER NOT NULL DEFAULT 0
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS faction_storage_points (
        storage_point_id SERIAL PRIMARY KEY,
        faction_id INTEGER NOT NULL REFERENCES factions(faction_id) ON DELETE CASCADE,
        storage_type TEXT NOT NULL,
        label TEXT NOT NULL,
        pos_x DOUBLE PRECISION NOT NULL,
        pos_y DOUBLE PRECISION NOT NULL,
        pos_z DOUBLE PRECISION NOT NULL,
        rot_z DOUBLE PRECISION NOT NULL,
        dimension INTEGER NOT NULL DEFAULT 0
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS faction_wardrobe_points (
        wardrobe_point_id SERIAL PRIMARY KEY,
        faction_id INTEGER NOT NULL REFERENCES factions(faction_id) ON DELETE CASCADE,
        label TEXT NOT NULL,
        pos_x DOUBLE PRECISION NOT NULL,
        pos_y DOUBLE PRECISION NOT NULL,
        pos_z DOUBLE PRECISION NOT NULL,
        rot_z DOUBLE PRECISION NOT NULL,
        dimension INTEGER NOT NULL DEFAULT 0
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS faction_outfits (
        outfit_id SERIAL PRIMARY KEY,
        faction_id INTEGER NOT NULL REFERENCES factions(faction_id) ON DELETE CASCADE,
        category TEXT NOT NULL DEFAULT 'dienst',
        name TEXT NOT NULL,
        clothing_json TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await client.query("ALTER TABLE faction_outfits ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'dienst';");

    await client.query(`
      CREATE TABLE IF NOT EXISTS faction_vehicles (
        faction_vehicle_id SERIAL PRIMARY KEY,
        faction_id INTEGER NOT NULL REFERENCES factions(faction_id) ON DELETE CASCADE,
        model_name TEXT NOT NULL,
        display_name TEXT NOT NULL,
        min_rank_level INTEGER NOT NULL DEFAULT 1,
        pos_x DOUBLE PRECISION NOT NULL,
        pos_y DOUBLE PRECISION NOT NULL,
        pos_z DOUBLE PRECISION NOT NULL,
        rot_z DOUBLE PRECISION NOT NULL,
        dimension INTEGER NOT NULL DEFAULT 0,
        number_plate TEXT NOT NULL DEFAULT 'ORG',
        color_primary INTEGER NOT NULL DEFAULT 0,
        color_secondary INTEGER NOT NULL DEFAULT 0,
        is_spawned BOOLEAN NOT NULL DEFAULT FALSE,
        fuel_level DOUBLE PRECISION NOT NULL DEFAULT 100.0,
        fuel_type TEXT NOT NULL DEFAULT 'petrol',
        health DOUBLE PRECISION NOT NULL DEFAULT 1000.0,
        is_locked BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await client.query("ALTER TABLE faction_vehicles ADD COLUMN IF NOT EXISTS is_spawned BOOLEAN NOT NULL DEFAULT FALSE;");
    await client.query("ALTER TABLE faction_vehicles ADD COLUMN IF NOT EXISTS fuel_level DOUBLE PRECISION NOT NULL DEFAULT 100.0;");
    await client.query("ALTER TABLE faction_vehicles ADD COLUMN IF NOT EXISTS fuel_type TEXT NOT NULL DEFAULT 'petrol';");
    await client.query("ALTER TABLE faction_vehicles ADD COLUMN IF NOT EXISTS health DOUBLE PRECISION NOT NULL DEFAULT 1000.0;");
    await client.query("ALTER TABLE faction_vehicles ADD COLUMN IF NOT EXISTS is_locked BOOLEAN NOT NULL DEFAULT FALSE;");

    await client.query(`
      CREATE TABLE IF NOT EXISTS vehicle_catalog (
        catalog_id SERIAL PRIMARY KEY,
        model_name TEXT NOT NULL,
        display_name TEXT NOT NULL,
        price INTEGER NOT NULL,
        fuel_type TEXT NOT NULL DEFAULT 'petrol',
        max_fuel DOUBLE PRECISION NOT NULL DEFAULT 100.0,
        image_url TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await client.query("ALTER TABLE vehicle_catalog ADD COLUMN IF NOT EXISTS fuel_type TEXT NOT NULL DEFAULT 'petrol';");
    await client.query("ALTER TABLE vehicle_catalog ADD COLUMN IF NOT EXISTS max_fuel DOUBLE PRECISION NOT NULL DEFAULT 100.0;");

    await client.query(`
      CREATE TABLE IF NOT EXISTS command_permissions (
        command_id TEXT PRIMARY KEY,
        required_level INTEGER NOT NULL DEFAULT 10,
        usage_label TEXT NOT NULL,
        description TEXT NOT NULL,
        category TEXT NOT NULL DEFAULT 'Allgemein'
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS command_aliases (
        alias TEXT PRIMARY KEY,
        command_id TEXT NOT NULL REFERENCES command_permissions(command_id) ON DELETE CASCADE
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS admin_logs (
        log_id SERIAL PRIMARY KEY,
        admin_account_id INTEGER NOT NULL REFERENCES accounts(account_id) ON DELETE CASCADE,
        action_type TEXT NOT NULL,
        target_id TEXT,
        details TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS faction_clothing_items (
        item_id SERIAL PRIMARY KEY,
        faction_id INTEGER NOT NULL REFERENCES factions(faction_id) ON DELETE CASCADE,
        min_rank INTEGER NOT NULL DEFAULT 1,
        component_id INTEGER NOT NULL,
        drawable_id INTEGER NOT NULL,
        texture_id INTEGER NOT NULL,
        label TEXT NOT NULL,
        category TEXT NOT NULL DEFAULT 'dienst'
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS personal_outfits (
        outfit_id SERIAL PRIMARY KEY,
        account_id INTEGER NOT NULL REFERENCES accounts(account_id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        clothing_json TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS character_inventories (
        character_id INTEGER PRIMARY KEY REFERENCES accounts(account_id) ON DELETE CASCADE,
        inventory_data JSONB NOT NULL DEFAULT '[]',
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // Add seed data if empty
    const catalogCountResult = await client.query("SELECT COUNT(*) FROM vehicle_catalog");
    if (parseInt(catalogCountResult.rows[0].count) === 0) {
      await client.query(`
        INSERT INTO vehicle_catalog (model_name, display_name, price, image_url) VALUES
        ('sultan', 'Sultan RS', 45000, NULL),
        ('elegy', 'Elegy RH8', 95000, NULL),
        ('faggio', 'Faggio Sport', 2500, NULL),
        ('kuruma', 'Kuruma (Armored)', 525000, NULL),
        ('pbus', 'Festival Bus', 125000, NULL)
      `);
    }

    const wardrobeSeedDefinitions = {
      LSPD: {
        factionName: "Police Department",
        colorHex: "#3B82F6",
        mapIconId: 60,
        clothingItems: [
          [1, 11, 55, 0, "LSPD Diensthemd", "tops"],
          [1, 4, 35, 0, "LSPD Einsatzhose", "legs"],
          [1, 6, 25, 0, "LSPD Stiefel", "feet"],
          [1, 9, 10, 0, "LSPD Schutzweste", "armor"],
          [3, 11, 58, 0, "LSPD Detective Jacke", "detective"],
          [5, 11, 119, 0, "LSPD Tactical Carrier", "tactical"]
        ],
        outfits: [
          ["dienst", "LSPD Streifendienst", JSON.stringify([[55, 0], [58, 0], [35, 0], [25, 0]])],
          ["detective", "LSPD Detective", JSON.stringify([[58, 0], [15, 0], [35, 0], [25, 0]])],
          ["tactical", "LSPD Taktisch", JSON.stringify([[119, 0], [15, 0], [35, 0], [25, 0]])]
        ]
      },
      FIB: {
        factionName: "Federal Investigation",
        colorHex: "#1E293B",
        mapIconId: 60,
        clothingItems: [
          [1, 11, 58, 0, "FIB Einsatzjacke", "tops"],
          [1, 4, 31, 0, "FIB Einsatzhose", "legs"],
          [1, 6, 25, 0, "FIB Stiefel", "feet"],
          [2, 9, 10, 0, "FIB Weste", "armor"],
          [4, 11, 124, 0, "FIB Tactical Rig", "tactical"]
        ],
        outfits: [
          ["dienst", "FIB Standard", JSON.stringify([[58, 0], [15, 0], [31, 0], [25, 0]])],
          ["tactical", "FIB Raid", JSON.stringify([[124, 0], [15, 0], [31, 0], [25, 0]])]
        ]
      },
      MD: {
        factionName: "Medical Department",
        colorHex: "#EF4444",
        mapIconId: 61,
        clothingItems: [
          [1, 11, 250, 0, "MD Dienstkleidung", "tops"],
          [1, 4, 96, 0, "MD Hose", "legs"],
          [1, 6, 25, 0, "MD Schuhe", "feet"],
          [2, 11, 249, 0, "MD Einsatzjacke", "dienst"]
        ],
        outfits: [
          ["dienst", "MD Sanitaeter", JSON.stringify([[250, 0], [15, 0], [96, 0], [25, 0]])],
          ["dienst", "MD Einsatz", JSON.stringify([[249, 0], [15, 0], [96, 0], [25, 0]])]
        ]
      }
    } satisfies Record<string, {
      factionName: string;
      colorHex: string;
      mapIconId: number;
      clothingItems: Array<[number, number, number, number, string, string]>;
      outfits: Array<[string, string, string]>;
    }>;

    // Seed State Factions and wardrobe test data if missing
    const factionCountResult = await client.query("SELECT COUNT(*) FROM factions WHERE type = 'state'");
    if (parseInt(factionCountResult.rows[0].count) === 0) {
      for (const [shortName, seed] of Object.entries(wardrobeSeedDefinitions)) {
        await client.query(
          `
            INSERT INTO factions (name, short_name, type, color_hex, map_icon_id)
            VALUES ($1, $2, 'state', $3, $4);
          `,
          [seed.factionName, shortName, seed.colorHex, seed.mapIconId]
        );
      }
    }

    for (const [shortName, seed] of Object.entries(wardrobeSeedDefinitions)) {
      const factionResult = await client.query(
        "SELECT faction_id FROM factions WHERE short_name = $1 LIMIT 1;",
        [shortName]
      );

      if ((factionResult.rowCount ?? 0) === 0) {
        continue;
      }

      const factionId = Number(factionResult.rows[0].faction_id);

      const itemCountResult = await client.query(
        "SELECT COUNT(*) FROM faction_clothing_items WHERE faction_id = $1;",
        [factionId]
      );

      if (parseInt(itemCountResult.rows[0].count) === 0) {
        for (const [minRank, componentId, drawableId, textureId, label, category] of seed.clothingItems) {
          await client.query(
            `
              INSERT INTO faction_clothing_items (faction_id, min_rank, component_id, drawable_id, texture_id, label, category)
              VALUES ($1, $2, $3, $4, $5, $6, $7);
            `,
            [factionId, minRank, componentId, drawableId, textureId, label, category]
          );
        }
      }

      const outfitCountResult = await client.query(
        "SELECT COUNT(*) FROM faction_outfits WHERE faction_id = $1;",
        [factionId]
      );

      if (parseInt(outfitCountResult.rows[0].count) === 0) {
        for (const [category, name, clothingJson] of seed.outfits) {
          await client.query(
            `
              INSERT INTO faction_outfits (faction_id, category, name, clothing_json)
              VALUES ($1, $2, $3, $4);
            `,
            [factionId, category, name, clothingJson]
          );
        }
      }
    }
  } finally {
    await client.query(`
      CREATE TABLE IF NOT EXISTS support_tickets (
        ticket_id SERIAL PRIMARY KEY,
        account_id INTEGER NOT NULL REFERENCES accounts(account_id) ON DELETE CASCADE,
        creator_name TEXT NOT NULL,
        title TEXT NOT NULL,
        category TEXT NOT NULL DEFAULT 'Allgemein',
        priority TEXT NOT NULL DEFAULT 'normal',
        status TEXT NOT NULL DEFAULT 'open',
        admin_account_id INTEGER REFERENCES accounts(account_id) ON DELETE SET NULL,
        admin_name TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        closed_at TIMESTAMPTZ,
        last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS support_ticket_messages (
        message_id SERIAL PRIMARY KEY,
        ticket_id INTEGER NOT NULL REFERENCES support_tickets(ticket_id) ON DELETE CASCADE,
        sender_type TEXT NOT NULL,
        sender_account_id INTEGER REFERENCES accounts(account_id) ON DELETE SET NULL,
        sender_name TEXT NOT NULL,
        message TEXT NOT NULL,
        internal_note BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS support_ticket_participants (
        ticket_id INTEGER NOT NULL REFERENCES support_tickets(ticket_id) ON DELETE CASCADE,
        admin_account_id INTEGER NOT NULL REFERENCES accounts(account_id) ON DELETE CASCADE,
        admin_name TEXT NOT NULL,
        role_label TEXT NOT NULL DEFAULT 'observer',
        added_by_account_id INTEGER REFERENCES accounts(account_id) ON DELETE SET NULL,
        added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (ticket_id, admin_account_id)
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS support_ticket_mutes (
        mute_id SERIAL PRIMARY KEY,
        account_id INTEGER NOT NULL REFERENCES accounts(account_id) ON DELETE CASCADE,
        admin_account_id INTEGER REFERENCES accounts(account_id) ON DELETE SET NULL,
        reason TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        expires_at TIMESTAMPTZ NOT NULL
      );
    `);

    // --- PHONE TABLES ---
    await client.query(`
      CREATE TABLE IF NOT EXISTS phone_phones (
        id VARCHAR(100) PRIMARY KEY,
        owner_id VARCHAR(100) NOT NULL,
        phone_number VARCHAR(15) UNIQUE NOT NULL,
        name VARCHAR(50),
        pin VARCHAR(4),
        face_id VARCHAR(100),
        settings JSONB,
        is_setup BOOLEAN DEFAULT FALSE,
        assigned BOOLEAN DEFAULT FALSE,
        battery INT DEFAULT 100,
        last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS phone_contacts (
        contact_id SERIAL PRIMARY KEY,
        phone_number VARCHAR(15) NOT NULL,
        contact_phone_number VARCHAR(15) NOT NULL,
        firstname VARCHAR(50) DEFAULT '',
        lastname VARCHAR(50) DEFAULT '',
        profile_image VARCHAR(500),
        email VARCHAR(100),
        address VARCHAR(100),
        favourite BOOLEAN DEFAULT FALSE
      );
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS phone_message_channels (
        channel_id SERIAL PRIMARY KEY,
        is_group BOOLEAN NOT NULL DEFAULT FALSE,
        name VARCHAR(50),
        last_message TEXT DEFAULT '',
        last_message_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS phone_message_members (
        channel_id INTEGER REFERENCES phone_message_channels(channel_id) ON DELETE CASCADE,
        phone_number VARCHAR(15) NOT NULL,
        is_owner BOOLEAN DEFAULT FALSE,
        unread INTEGER DEFAULT 0,
        PRIMARY KEY (channel_id, phone_number)
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS phone_message_messages (
        message_id SERIAL PRIMARY KEY,
        channel_id INTEGER REFERENCES phone_message_channels(channel_id) ON DELETE CASCADE,
        sender VARCHAR(15) NOT NULL,
        content TEXT,
        attachments JSONB,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS phone_twitter_accounts (
        username VARCHAR(20) PRIMARY KEY,
        display_name VARCHAR(30) NOT NULL,
        password VARCHAR(100) NOT NULL,
        phone_number VARCHAR(15) NOT NULL,
        bio VARCHAR(100),
        profile_image VARCHAR(500),
        profile_header VARCHAR(500),
        verified BOOLEAN DEFAULT FALSE,
        date_joined TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS phone_twitter_tweets (
        tweet_id SERIAL PRIMARY KEY,
        username VARCHAR(20) REFERENCES phone_twitter_accounts(username) ON DELETE CASCADE,
        content VARCHAR(280),
        attachments JSONB,
        reply_to INTEGER,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    // --- END PHONE TABLES ---

    client.release();
  }
}
