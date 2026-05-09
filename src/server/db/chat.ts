import { pool } from "./pool";

export interface ChatMuteRecord {
  id: number;
  characterId: number;
  accountId: number;
  mutedByAccountId: number | null;
  mutedByName: string;
  reason: string;
  expiresAt: Date;
  createdAt: Date;
}

function mapChatMute(row: any): ChatMuteRecord {
  return {
    id: row.id,
    characterId: row.character_id,
    accountId: row.account_id,
    mutedByAccountId: row.muted_by_account_id ?? null,
    mutedByName: row.muted_by_name,
    reason: row.reason,
    expiresAt: row.expires_at,
    createdAt: row.created_at
  };
}

export async function createChatMute(input: {
  characterId: number;
  accountId: number;
  mutedByAccountId: number | null;
  mutedByName: string;
  reason: string;
  expiresAt: Date;
}) {
  await pool.query("UPDATE chat_mutes SET lifted_at = NOW() WHERE character_id = $1 AND lifted_at IS NULL", [input.characterId]);
  const result = await pool.query(
    `
      INSERT INTO chat_mutes (character_id, account_id, muted_by_account_id, muted_by_name, reason, expires_at)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `,
    [input.characterId, input.accountId, input.mutedByAccountId, input.mutedByName, input.reason, input.expiresAt]
  );
  return mapChatMute(result.rows[0]);
}

export async function clearChatMute(characterId: number) {
  const result = await pool.query(
    `
      UPDATE chat_mutes
      SET lifted_at = NOW()
      WHERE character_id = $1 AND lifted_at IS NULL AND expires_at > NOW()
      RETURNING *
    `,
    [characterId]
  );
  return result.rows.map(mapChatMute);
}

export async function findActiveChatMute(characterId: number) {
  const result = await pool.query(
    `
      SELECT *
      FROM chat_mutes
      WHERE character_id = $1 AND lifted_at IS NULL AND expires_at > NOW()
      ORDER BY created_at DESC
      LIMIT 1
    `,
    [characterId]
  );
  return result.rows[0] ? mapChatMute(result.rows[0]) : null;
}
