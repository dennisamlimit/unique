import { getPool } from "../../infrastructure/database.js";
import { DatabaseError } from "../../shared/errors.js";
import type { Character } from "./character.js";

type RawCharacterRow = {
  character_id: number;
  account_id: number;
  first_name: string;
  last_name: string;
  cash: number;
  bank_cash: number;
  admin_level: number;
  customization_json: string | null;
  phone_number: string | null;
  pos_x: number;
  pos_y: number;
  pos_z: number;
  rot_z: number;
  dimension: number;
  health: number;
  armor: number;
  is_banned: boolean;
  ban_reason: string | null;
  ban_expires_at: string | null;
  created_at: string;
};

function mapRowToCharacter(row: RawCharacterRow): Character {
  return {
    characterId: row.character_id,
    accountId: row.account_id,
    firstName: row.first_name,
    lastName: row.last_name,
    cash: row.cash,
    bankCash: row.bank_cash,
    adminLevel: row.admin_level,
    customizationJson: row.customization_json,
    phoneNumber: row.phone_number,
    posX: row.pos_x,
    posY: row.pos_y,
    posZ: row.pos_z,
    rotZ: row.rot_z,
    dimension: row.dimension,
    health: row.health,
    armor: row.armor,
    isBanned: row.is_banned,
    banReason: row.ban_reason,
    banExpiresAt: row.ban_expires_at,
    createdAt: row.created_at
  };
}

export class CharacterRepository {
  async getByAccountId(accountId: number): Promise<Character[]> {
    try {
      const result = await getPool().query("SELECT * FROM characters WHERE account_id = $1 ORDER BY created_at ASC", [accountId]);
      return result.rows.map(mapRowToCharacter);
    } catch (cause) {
      throw new DatabaseError("getByAccountId failed", cause);
    }
  }

  async getById(characterId: number): Promise<Character | null> {
    try {
      const result = await getPool().query("SELECT * FROM characters WHERE character_id = $1 LIMIT 1", [characterId]);
      return result.rows.length > 0 ? mapRowToCharacter(result.rows[0]) : null;
    } catch (cause) {
      throw new DatabaseError("getById failed", cause);
    }
  }

  async create(character: Omit<Character, "characterId" | "createdAt">): Promise<Character> {
    try {
      const result = await getPool().query(
        `
        INSERT INTO characters (
          account_id, first_name, last_name, cash, bank_cash,
          admin_level, customization_json, phone_number,
          pos_x, pos_y, pos_z, rot_z, dimension, health, armor,
          is_banned, ban_reason, ban_expires_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18
        ) RETURNING *
      `,
        [
          character.accountId, character.firstName, character.lastName, character.cash, character.bankCash,
          character.adminLevel, character.customizationJson, character.phoneNumber,
          character.posX, character.posY, character.posZ, character.rotZ, character.dimension,
          character.health, character.armor, character.isBanned, character.banReason, character.banExpiresAt
        ]
      );
      return mapRowToCharacter(result.rows[0]);
    } catch (cause) {
      throw new DatabaseError("create failed", cause);
    }
  }

  async updateState(characterId: number, update: Partial<Character>): Promise<Character | null> {
    try {
      const result = await getPool().query(
        `
        UPDATE characters SET
          cash = COALESCE($1, cash),
          bank_cash = COALESCE($2, bank_cash),
          health = COALESCE($3, health),
          armor = COALESCE($4, armor),
          dimension = COALESCE($5, dimension),
          pos_x = COALESCE($6, pos_x),
          pos_y = COALESCE($7, pos_y),
          pos_z = COALESCE($8, pos_z),
          rot_z = COALESCE($9, rot_z),
          customization_json = COALESCE($10, customization_json)
        WHERE character_id = $11 RETURNING *
      `,
        [
          update.cash, update.bankCash, update.health, update.armor, update.dimension,
          update.posX, update.posY, update.posZ, update.rotZ,
          update.customizationJson ? (typeof update.customizationJson === 'string' ? update.customizationJson : JSON.stringify(update.customizationJson)) : null,
          characterId
        ]
      );
      return result.rows.length > 0 ? mapRowToCharacter(result.rows[0]) : null;
    } catch (cause) {
      throw new DatabaseError("updateState failed", cause);
    }
  }

  async getStarterMoney(): Promise<number> {
    try {
      const result = await getPool().query("SELECT setting_value FROM server_settings WHERE setting_key = 'starter_money'");
      return result.rows.length > 0 ? parseInt(result.rows[0].setting_value) : 100;
    } catch (cause) {
      throw new DatabaseError("getStarterMoney failed", cause);
    }
  }
}
