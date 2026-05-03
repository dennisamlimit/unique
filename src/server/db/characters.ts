import { config } from "../config";
import { pool } from "./pool";

export interface CharacterRecord {
  id: number;
  accountId: number;
  slot: number;
  firstName: string;
  lastName: string;
  level: number;
  experience: number;
  organization: string;
  organizationRank: string;
  maritalStatus: "single" | "married";
  bankBalance: number;
  cash: number;
  position: {
    x: number;
    y: number;
    z: number;
    heading: number;
  };
  appearance: CharacterAppearance;
  isDraft: boolean;
  isDead: boolean;
}

export interface CharacterAppearance {
  gender: "male" | "female";
  blendData: number[];
  eyeColor: number;
  hair: number[];
  beard: number[];
  faceFeatures: number[];
  headOverlays: number[];
  headOverlayColors: number[];
  headOverlayOpacities: number[];
  clothing: number[];
  clothingTextures: number[];
  props: number[];
  propTextures: number[];
}

export const defaultAppearance: CharacterAppearance = {
  gender: "male",
  blendData: [0, 0, 0, 0, 0.5, 0.5],
  eyeColor: 0,
  hair: [0, 0, 0],
  beard: [255, 0],
  faceFeatures: Array.from({ length: 20 }, () => 0),
  headOverlays: Array.from({ length: 12 }, () => -1),
  headOverlayColors: Array.from({ length: 12 }, () => 0),
  headOverlayOpacities: Array.from({ length: 12 }, () => 1),
  clothing: [0, 0, 0, 15, 0, 0, 1, 0, 15, 0, 0, 15],
  clothingTextures: Array.from({ length: 12 }, () => 0),
  props: [-1, -1, -1, -1, -1],
  propTextures: Array.from({ length: 5 }, () => 0)
};

function mapCharacter(row: any): CharacterRecord {
  return {
    id: row.id,
    accountId: row.account_id,
    slot: row.slot,
    firstName: row.first_name,
    lastName: row.last_name,
    level: row.level,
    experience: row.experience ?? 0,
    organization: row.organization ?? "Zivilist",
    organizationRank: row.organization_rank ?? "Keine",
    maritalStatus: row.marital_status === "married" ? "married" : "single",
    bankBalance: row.bank_balance,
    cash: row.cash,
    position: row.position,
    appearance: row.appearance ?? defaultAppearance,
    isDraft: row.is_draft ?? false,
    isDead: row.is_dead ?? false
  };
}

export async function listCharacters(accountId: number) {
  const result = await pool.query(
    "SELECT * FROM characters WHERE account_id = $1 AND is_draft = false ORDER BY slot ASC",
    [accountId]
  );
  return result.rows.map(mapCharacter);
}

export async function findCharacter(accountId: number, characterId: number) {
  const result = await pool.query("SELECT * FROM characters WHERE account_id = $1 AND id = $2 AND is_draft = false", [
    accountId,
    characterId
  ]);
  return result.rows[0] ? mapCharacter(result.rows[0]) : null;
}

export async function setCharacterCash(characterId: number, cash: number) {
  const result = await pool.query("UPDATE characters SET cash = $2, updated_at = NOW() WHERE id = $1 RETURNING *", [
    characterId,
    cash
  ]);
  return result.rows[0] ? mapCharacter(result.rows[0]) : null;
}

export async function setCharacterBankBalance(characterId: number, bankBalance: number) {
  const result = await pool.query("UPDATE characters SET bank_balance = $2, updated_at = NOW() WHERE id = $1 RETURNING *", [
    characterId,
    bankBalance
  ]);
  return result.rows[0] ? mapCharacter(result.rows[0]) : null;
}

export async function updateCharacterPosition(characterId: number, position: CharacterRecord["position"]) {
  const result = await pool.query("UPDATE characters SET position = $2::jsonb, updated_at = NOW() WHERE id = $1 RETURNING *", [
    characterId,
    JSON.stringify(position)
  ]);
  return result.rows[0] ? mapCharacter(result.rows[0]) : null;
}

export async function setCharacterDead(characterId: number, isDead: boolean) {
  const result = await pool.query("UPDATE characters SET is_dead = $2, updated_at = NOW() WHERE id = $1 RETURNING *", [
    characterId,
    isDead
  ]);
  return result.rows[0] ? mapCharacter(result.rows[0]) : null;
}

export async function logCharacterSpawn(characterId: number, spawnType: string, position: CharacterRecord["position"]) {
  await pool.query(
    "INSERT INTO character_spawn_logs (character_id, spawn_type, position) VALUES ($1, $2, $3::jsonb)",
    [characterId, spawnType, JSON.stringify(position)]
  );
}

export async function findLastCharacterSpawn(characterId: number) {
  const result = await pool.query(
    "SELECT * FROM character_spawn_logs WHERE character_id = $1 ORDER BY created_at DESC LIMIT 1",
    [characterId]
  );
  const row = result.rows[0];
  if (!row) {
    return null;
  }

  return {
    id: row.id as number,
    characterId: row.character_id as number,
    spawnType: row.spawn_type as string,
    position: row.position as CharacterRecord["position"],
    createdAt: row.created_at as Date
  };
}

export async function findDraftCharacter(accountId: number, characterId: number) {
  const result = await pool.query("SELECT * FROM characters WHERE account_id = $1 AND id = $2 AND is_draft = true", [
    accountId,
    characterId
  ]);
  return result.rows[0] ? mapCharacter(result.rows[0]) : null;
}

export async function findDraftCharacterBySlot(accountId: number, slot: number) {
  const result = await pool.query("SELECT * FROM characters WHERE account_id = $1 AND slot = $2 AND is_draft = true", [
    accountId,
    slot
  ]);
  return result.rows[0] ? mapCharacter(result.rows[0]) : null;
}

export async function createDraftCharacter(input: { accountId: number; slot: number }) {
  const result = await pool.query(
    `
      INSERT INTO characters (account_id, slot, first_name, last_name, position, appearance, is_draft)
      VALUES ($1, $2, 'Creator', 'Draft', $3::jsonb, $4::jsonb, true)
      RETURNING *
    `,
    [
      input.accountId,
      input.slot,
      JSON.stringify(config.spawn),
      JSON.stringify(defaultAppearance)
    ]
  );

  return mapCharacter(result.rows[0]);
}

export async function createCharacter(input: {
  accountId: number;
  slot: number;
  firstName: string;
  lastName: string;
  appearance: CharacterAppearance;
}) {
  await pool.query("DELETE FROM characters WHERE account_id = $1 AND slot = $2 AND is_draft = true", [
    input.accountId,
    input.slot
  ]);

  const result = await pool.query(
    `
      INSERT INTO characters (account_id, slot, first_name, last_name, position, appearance, is_draft)
      VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, false)
      RETURNING *
    `,
    [
      input.accountId,
      input.slot,
      input.firstName,
      input.lastName,
      JSON.stringify(config.spawn),
      JSON.stringify(input.appearance)
    ]
  );

  return mapCharacter(result.rows[0]);
}

export async function completeDraftCharacter(input: {
  accountId: number;
  characterId: number;
  firstName: string;
  lastName: string;
  appearance: CharacterAppearance;
}) {
  const result = await pool.query(
    `
      UPDATE characters
      SET first_name = $3,
          last_name = $4,
          appearance = $5::jsonb,
          is_draft = false,
          updated_at = NOW()
      WHERE account_id = $1 AND id = $2 AND is_draft = true
      RETURNING *
    `,
    [
      input.accountId,
      input.characterId,
      input.firstName,
      input.lastName,
      JSON.stringify(input.appearance)
    ]
  );

  return result.rows[0] ? mapCharacter(result.rows[0]) : null;
}

export async function deleteDraftCharacter(accountId: number, characterId: number) {
  await pool.query("DELETE FROM characters WHERE account_id = $1 AND id = $2 AND is_draft = true", [
    accountId,
    characterId
  ]);
}

export async function deleteDraftCharacters(accountId: number) {
  await pool.query("DELETE FROM characters WHERE account_id = $1 AND is_draft = true", [accountId]);
}
