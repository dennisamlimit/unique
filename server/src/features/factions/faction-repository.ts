import { getPool } from "../../infrastructure/database.js";
import type { Faction, FactionMembership, FactionMemberProfile, FactionRank, FactionType } from "./faction.js";

function mapFaction(row: Record<string, unknown>): Faction {
  return {
    factionId: Number(row.faction_id),
    name: String(row.name),
    shortName: String(row.short_name),
    type: String(row.type) as FactionType,
    colorHex: String(row.color_hex),
    createdAt: String(row.created_at)
  };
}

function mapRank(row: Record<string, unknown>): FactionRank {
  return {
    factionId: Number(row.faction_id),
    rankLevel: Number(row.rank_level),
    rankName: String(row.rank_name)
  };
}

function mapMembership(row: Record<string, unknown>): FactionMembership {
  return {
    accountId: Number(row.account_id),
    factionId: Number(row.faction_id),
    rankLevel: Number(row.rank_level),
    joinedAt: String(row.joined_at)
  };
}

function mapMemberProfile(row: Record<string, unknown>): FactionMemberProfile {
  return {
    accountId: Number(row.account_id),
    factionId: Number(row.faction_id),
    factionName: String(row.faction_name),
    factionShortName: String(row.faction_short_name),
    factionType: String(row.faction_type) as FactionType,
    factionColorHex: String(row.faction_color_hex),
    rankLevel: Number(row.rank_level),
    rankName: String(row.rank_name),
    joinedAt: String(row.joined_at)
  };
}

export class FactionRepository {
  async getById(factionId: number) {
    const result = await getPool().query(
      "SELECT * FROM factions WHERE faction_id = $1 LIMIT 1;",
      [factionId]
    );
    return result.rows[0] ? mapFaction(result.rows[0]) : null;
  }

  async getByName(name: string) {
    const result = await getPool().query(
      "SELECT * FROM factions WHERE LOWER(name) = LOWER($1) LIMIT 1;",
      [name.trim()]
    );
    return result.rows[0] ? mapFaction(result.rows[0]) : null;
  }

  async getAll() {
    const result = await getPool().query("SELECT * FROM factions ORDER BY name;");
    return result.rows.map(mapFaction);
  }

  async create(faction: Omit<Faction, "factionId" | "createdAt">) {
    const result = await getPool().query(
      `
        INSERT INTO factions (name, short_name, type, color_hex)
        VALUES ($1, $2, $3, $4)
        RETURNING *;
      `,
      [faction.name, faction.shortName, faction.type, faction.colorHex]
    );
    return mapFaction(result.rows[0]);
  }

  async delete(factionId: number) {
    const result = await getPool().query(
      "DELETE FROM factions WHERE faction_id = $1 RETURNING *;",
      [factionId]
    );
    return result.rowCount > 0;
  }

  async getRanksByFactionId(factionId: number) {
    const result = await getPool().query(
      "SELECT * FROM faction_ranks WHERE faction_id = $1 ORDER BY rank_level;",
      [factionId]
    );
    return result.rows.map(mapRank);
  }

  async upsertRank(factionId: number, rankLevel: number, rankName: string) {
    const result = await getPool().query(
      `
        INSERT INTO faction_ranks (faction_id, rank_level, rank_name)
        VALUES ($1, $2, $3)
        ON CONFLICT (faction_id, rank_level) DO UPDATE SET rank_name = EXCLUDED.rank_name
        RETURNING *;
      `,
      [factionId, rankLevel, rankName]
    );
    return mapRank(result.rows[0]);
  }

  async getMembershipByAccountId(accountId: number) {
    const result = await getPool().query(
      "SELECT * FROM faction_memberships WHERE account_id = $1 LIMIT 1;",
      [accountId]
    );
    return result.rows[0] ? mapMembership(result.rows[0]) : null;
  }

  async getMembersByFactionId(factionId: number) {
    const result = await getPool().query(
      "SELECT * FROM faction_memberships WHERE faction_id = $1 ORDER BY rank_level DESC;",
      [factionId]
    );
    return result.rows.map(mapMembership);
  }

  async getLeaderMembership(factionId: number) {
    const result = await getPool().query(
      "SELECT * FROM faction_memberships WHERE faction_id = $1 AND rank_level = 6 LIMIT 1;",
      [factionId]
    );
    return result.rows[0] ? mapMembership(result.rows[0]) : null;
  }

  async assignMember(factionId: number, accountId: number, rankLevel: number) {
    const result = await getPool().query(
      `
        INSERT INTO faction_memberships (account_id, faction_id, rank_level)
        VALUES ($1, $2, $3)
        ON CONFLICT (account_id) DO UPDATE SET faction_id = EXCLUDED.faction_id, rank_level = EXCLUDED.rank_level, joined_at = NOW()
        RETURNING *;
      `,
      [accountId, factionId, rankLevel]
    );
    return mapMembership(result.rows[0]);
  }

  async removeMember(accountId: number) {
    const result = await getPool().query(
      "DELETE FROM faction_memberships WHERE account_id = $1 RETURNING *;",
      [accountId]
    );
    return result.rowCount > 0;
  }

  async getMemberProfile(accountId: number): Promise<FactionMemberProfile | null> {
    const result = await getPool().query(
      `
        SELECT
          fm.account_id,
          fm.faction_id,
          f.name AS faction_name,
          f.short_name AS faction_short_name,
          f.type AS faction_type,
          f.color_hex AS faction_color_hex,
          fm.rank_level,
          COALESCE(fr.rank_name, 'Rang ' || fm.rank_level) AS rank_name,
          fm.joined_at
        FROM faction_memberships fm
        JOIN factions f ON f.faction_id = fm.faction_id
        LEFT JOIN faction_ranks fr ON fr.faction_id = fm.faction_id AND fr.rank_level = fm.rank_level
        WHERE fm.account_id = $1
        LIMIT 1;
      `,
      [accountId]
    );
    return result.rows[0] ? mapMemberProfile(result.rows[0]) : null;
  }
}
