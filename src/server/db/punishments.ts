import { pool } from "./pool";

export type AdminPunishmentType = "ban" | "iban" | "jail" | "warn";

export interface AdminPunishmentRecord {
  id: number;
  type: AdminPunishmentType;
  accountId: number | null;
  characterId: number | null;
  targetName: string;
  adminAccountId: number | null;
  adminCharacterId: number | null;
  adminName: string;
  reason: string;
  durationSeconds: number;
  expiresAt: Date;
  liftedAt: Date | null;
  createdAt: Date;
}

function mapPunishment(row: any): AdminPunishmentRecord {
  return {
    id: row.id,
    type: row.type,
    accountId: row.account_id ?? null,
    characterId: row.character_id ?? null,
    targetName: row.target_name,
    adminAccountId: row.admin_account_id ?? null,
    adminCharacterId: row.admin_character_id ?? null,
    adminName: row.admin_name,
    reason: row.reason,
    durationSeconds: row.duration_seconds,
    expiresAt: row.expires_at,
    liftedAt: row.lifted_at ?? null,
    createdAt: row.created_at
  };
}

export async function createAdminPunishment(input: {
  type: AdminPunishmentType;
  accountId: number | null;
  characterId: number | null;
  targetName: string;
  adminAccountId: number | null;
  adminCharacterId: number | null;
  adminName: string;
  reason: string;
  durationSeconds: number;
  expiresAt: Date;
}) {
  if (input.type !== "warn") {
    await pool.query(
      "UPDATE admin_punishments SET lifted_at = NOW() WHERE type = $1 AND character_id IS NOT DISTINCT FROM $2 AND account_id IS NOT DISTINCT FROM $3 AND lifted_at IS NULL AND expires_at > NOW()",
      [input.type, input.characterId, input.accountId]
    );
  }

  const result = await pool.query(
    `
      INSERT INTO admin_punishments (
        type, account_id, character_id, target_name, admin_account_id, admin_character_id,
        admin_name, reason, duration_seconds, expires_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `,
    [
      input.type,
      input.accountId,
      input.characterId,
      input.targetName,
      input.adminAccountId,
      input.adminCharacterId,
      input.adminName,
      input.reason,
      input.durationSeconds,
      input.expiresAt
    ]
  );
  return mapPunishment(result.rows[0]);
}

export async function findActiveCharacterBan(characterId: number) {
  return findActivePunishmentByCharacter(characterId, "ban");
}

export async function findActiveAccountBan(accountId: number) {
  const result = await pool.query(
    `
      SELECT *
      FROM admin_punishments
      WHERE account_id = $1 AND type = 'iban' AND lifted_at IS NULL AND expires_at > NOW()
      ORDER BY created_at DESC
      LIMIT 1
    `,
    [accountId]
  );
  return result.rows[0] ? mapPunishment(result.rows[0]) : null;
}

export async function findActiveJail(characterId: number) {
  return findActivePunishmentByCharacter(characterId, "jail");
}

export async function countActiveWarns(characterId: number) {
  const result = await pool.query(
    `
      SELECT COUNT(*)::int AS count
      FROM admin_punishments
      WHERE character_id = $1 AND type = 'warn' AND lifted_at IS NULL AND expires_at > NOW()
    `,
    [characterId]
  );
  return Number(result.rows[0]?.count ?? 0);
}

export async function liftActivePunishments(input: {
  type: AdminPunishmentType | AdminPunishmentType[];
  accountId?: number | null;
  characterId?: number | null;
  liftedByAccountId: number | null;
  liftedByName: string;
}) {
  const types = Array.isArray(input.type) ? input.type : [input.type];
  const result = await pool.query(
    `
      UPDATE admin_punishments
      SET lifted_at = NOW(), lifted_by_account_id = $4, lifted_by_name = $5
      WHERE type = ANY($1::text[])
        AND lifted_at IS NULL
        AND expires_at > NOW()
        AND (
          ($2::int IS NOT NULL AND account_id = $2)
          OR ($3::int IS NOT NULL AND character_id = $3)
        )
      RETURNING *
    `,
    [types, input.accountId ?? null, input.characterId ?? null, input.liftedByAccountId, input.liftedByName]
  );
  return result.rows.map(mapPunishment);
}

export async function liftLatestActiveWarn(input: {
  characterId: number;
  liftedByAccountId: number | null;
  liftedByName: string;
}) {
  const result = await pool.query(
    `
      UPDATE admin_punishments
      SET lifted_at = NOW(), lifted_by_account_id = $2, lifted_by_name = $3
      WHERE id = (
        SELECT id
        FROM admin_punishments
        WHERE character_id = $1 AND type = 'warn' AND lifted_at IS NULL AND expires_at > NOW()
        ORDER BY created_at DESC, id DESC
        LIMIT 1
      )
      RETURNING *
    `,
    [input.characterId, input.liftedByAccountId, input.liftedByName]
  );
  return result.rows[0] ? mapPunishment(result.rows[0]) : null;
}

async function findActivePunishmentByCharacter(characterId: number, type: AdminPunishmentType) {
  const result = await pool.query(
    `
      SELECT *
      FROM admin_punishments
      WHERE character_id = $1 AND type = $2 AND lifted_at IS NULL AND expires_at > NOW()
      ORDER BY created_at DESC
      LIMIT 1
    `,
    [characterId, type]
  );
  return result.rows[0] ? mapPunishment(result.rows[0]) : null;
}
