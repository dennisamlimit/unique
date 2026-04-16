import { getPool } from "../../infrastructure/database.js";
import type { Account } from "./account.js";

type RawAccountRow = {
  account_id: number;
  first_name: string;
  last_name: string;
  email: string;
  social_club_name: string | null;
  social_club_id: string | null;
  phone_number: string | null;
  password_hash: string;
  password_salt: string;
  character_created: boolean;
  birth_date: string | null;
  origin: string | null;
  customization_json: string | null;
  admin_level: number;
  cash: number;
  bank_cash: number;
  health: number;
  armor: number;
  dimension: number;
  pos_x: number;
  pos_y: number;
  pos_z: number;
  rot_z: number;
  is_banned: boolean;
  ban_reason: string | null;
  ban_date: string | null;
  ban_expires_at: string | null;
  ban_admin_name: string | null;
  ban_admin_account_id: number;
};

function mapRowToAccount(row: RawAccountRow): Account {
  return {
    accountId: row.account_id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    socialClubName: row.social_club_name,
    socialClubId: row.social_club_id,
    phoneNumber: row.phone_number,
    passwordHash: row.password_hash,
    passwordSalt: row.password_salt,
    characterCreated: row.character_created,
    birthDate: row.birth_date,
    origin: row.origin,
    customizationJson: row.customization_json,
    adminLevel: row.admin_level,
    cash: row.cash,
    bankCash: row.bank_cash,
    health: row.health,
    armor: row.armor,
    dimension: row.dimension,
    posX: row.pos_x,
    posY: row.pos_y,
    posZ: row.pos_z,
    rotZ: row.rot_z,
    isBanned: row.is_banned,
    banReason: row.ban_reason,
    banDate: row.ban_date,
    banExpiresAt: row.ban_expires_at,
    banAdminName: row.ban_admin_name,
    banAdminAccountId: row.ban_admin_account_id
  };
}

export class AccountRepository {
  async emailExists(email: string) {
    const result = await getPool().query("SELECT 1 FROM accounts WHERE email = $1 LIMIT 1", [email]);
    return (result.rowCount ?? 0) > 0;
  }

  async socialClubExists(socialClubId: string) {
    const result = await getPool().query("SELECT 1 FROM accounts WHERE social_club_id = $1 LIMIT 1", [socialClubId]);
    return (result.rowCount ?? 0) > 0;
  }

  async getById(accountId: number) {
    const result = await getPool().query("SELECT * FROM accounts WHERE account_id = $1 LIMIT 1", [accountId]);
    return result.rows.length > 0 ? mapRowToAccount(result.rows[0]) : null;
  }

  async getByEmail(email: string) {
    const result = await getPool().query("SELECT * FROM accounts WHERE email = $1 LIMIT 1", [email]);
    return result.rows.length > 0 ? mapRowToAccount(result.rows[0]) : null;
  }

  async getBySocialClubId(socialClubId: string) {
    const result = await getPool().query("SELECT * FROM accounts WHERE social_club_id = $1 LIMIT 1", [socialClubId]);
    return result.rows.length > 0 ? mapRowToAccount(result.rows[0]) : null;
  }

  async create(account: Omit<Account, "accountId">) {
    const result = await getPool().query(
      `
        INSERT INTO accounts (
          first_name, last_name, email, social_club_name, social_club_id, password_hash, password_salt,
          character_created, birth_date, origin, customization_json, admin_level, cash, bank_cash,
          health, armor, dimension, pos_x, pos_y, pos_z, rot_z, is_banned, ban_reason, ban_date,
          ban_expires_at, ban_admin_name, ban_admin_account_id, phone_number
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28
        ) RETURNING *
      `,
      [
        account.firstName, account.lastName, account.email, account.socialClubName, account.socialClubId,
        account.passwordHash, account.passwordSalt, account.characterCreated, account.birthDate,
        account.origin, account.customizationJson, account.adminLevel, account.cash, account.bankCash,
        account.health, account.armor, account.dimension, account.posX, account.posY, account.posZ,
        account.rotZ, account.isBanned, account.banReason, account.banDate, account.banExpiresAt,
        account.banAdminName, account.banAdminAccountId, account.phoneNumber
      ]
    );
    return mapRowToAccount(result.rows[0]);
  }

  async updateSocialClub(accountId: number, name: string | null, socialClubId: string) {
    const result = await getPool().query(
      "UPDATE accounts SET social_club_name = $1, social_club_id = $2 WHERE account_id = $3 RETURNING *",
      [name, socialClubId, accountId]
    );
    return result.rows.length > 0 ? mapRowToAccount(result.rows[0]) : null;
  }

  async updateBanState(accountId: number, banned: boolean, reason: string | null, expiresAt?: string | null, adminName?: string | null, adminAccountId?: number | null) {
    const result = await getPool().query(
      "UPDATE accounts SET is_banned = $1, ban_reason = $2, ban_expires_at = $3, ban_admin_name = $4, ban_admin_account_id = $5, ban_date = NOW()::text WHERE account_id = $6 RETURNING *",
      [banned, reason, expiresAt, adminName, adminAccountId ?? 0, accountId]
    );
    return result.rows.length > 0 ? mapRowToAccount(result.rows[0]) : null;
  }

  async updateCharacter(accountId: number, update: Partial<Account>) {
    const result = await getPool().query(
      `
        UPDATE accounts SET
          first_name = $1, last_name = $2, character_created = $3, birth_date = $4, origin = $5, customization_json = $6, phone_number = $7
        WHERE account_id = $8 RETURNING *
      `,
      [
        update.firstName, 
        update.lastName, 
        update.characterCreated, 
        update.birthDate, 
        update.origin, 
        update.customizationJson ? (typeof update.customizationJson === 'string' ? update.customizationJson : JSON.stringify(update.customizationJson)) : null, 
        update.phoneNumber, 
        accountId
      ]
    );
    return result.rows.length > 0 ? mapRowToAccount(result.rows[0]) : null;
  }

  async updateState(accountId: number, update: Partial<Account>) {
    const result = await getPool().query(
      `
        UPDATE accounts SET
          cash = $1, bank_cash = $2, health = $3, armor = $4, dimension = $5, pos_x = $6, pos_y = $7, pos_z = $8, rot_z = $9, customization_json = $10
        WHERE account_id = $11 RETURNING *
      `,
      [
        update.cash, 
        update.bankCash, 
        update.health, 
        update.armor, 
        update.dimension, 
        update.posX, 
        update.posY, 
        update.posZ, 
        update.rotZ, 
        update.customizationJson ? (typeof update.customizationJson === 'string' ? update.customizationJson : JSON.stringify(update.customizationJson)) : null, 
        accountId
      ]
    );
    return result.rows.length > 0 ? mapRowToAccount(result.rows[0]) : null;
  }

  async getByName(firstName: string, lastName: string) {
    const result = await getPool().query("SELECT * FROM accounts WHERE LOWER(first_name) = LOWER($1) AND LOWER(last_name) = LOWER($2) LIMIT 1", [firstName, lastName]);
    return result.rows.length > 0 ? mapRowToAccount(result.rows[0]) : null;
  }

  async countPersonalOutfits(accountId: number) {
    const result = await getPool().query("SELECT COUNT(*) FROM personal_outfits WHERE account_id = $1", [accountId]);
    return parseInt(result.rows[0].count);
  }

  async createPersonalOutfit(accountId: number, name: string, clothingJson: string) {
    const result = await getPool().query(
      "INSERT INTO personal_outfits (account_id, name, clothing_json) VALUES ($1, $2, $3) RETURNING *",
      [accountId, name, clothingJson]
    );
    return result.rows[0];
  }

  async getPersonalOutfits(accountId: number) {
    const result = await getPool().query("SELECT * FROM personal_outfits WHERE account_id = $1 ORDER BY created_at DESC", [accountId]);
    return result.rows;
  }

  async getPersonalOutfitById(outfitId: number, accountId: number) {
    const result = await getPool().query("SELECT * FROM personal_outfits WHERE outfit_id = $1 AND account_id = $2 LIMIT 1", [outfitId, accountId]);
    return result.rows[0] || null;
  }

  async deletePersonalOutfit(outfitId: number, accountId: number) {
    const result = await getPool().query("DELETE FROM personal_outfits WHERE outfit_id = $1 AND account_id = $2", [outfitId, accountId]);
    return (result.rowCount ?? 0) > 0;
  }
}
