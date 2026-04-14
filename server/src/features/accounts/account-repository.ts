import { getPool } from "../../infrastructure/database.js";
import type { Account } from "./account.js";

function mapAccount(row: Record<string, unknown>): Account {
  return {
    accountId: Number(row.account_id),
    firstName: String(row.first_name),
    lastName: String(row.last_name),
    email: String(row.email),
    socialClubName: row.social_club_name ? String(row.social_club_name) : null,
    socialClubId: row.social_club_id ? String(row.social_club_id) : null,
    passwordHash: String(row.password_hash),
    passwordSalt: String(row.password_salt),
    characterCreated: Boolean(row.character_created),
    birthDate: row.birth_date ? String(row.birth_date) : null,
    origin: row.origin ? String(row.origin) : null,
    customizationJson: row.customization_json ? String(row.customization_json) : null,
    adminLevel: Number(row.admin_level),
    cash: Number(row.cash),
    bankCash: Number(row.bank_cash),
    health: Number(row.health),
    armor: Number(row.armor),
    dimension: Number(row.dimension),
    posX: Number(row.pos_x),
    posY: Number(row.pos_y),
    posZ: Number(row.pos_z),
    rotZ: Number(row.rot_z),
    isBanned: Boolean(row.is_banned),
    banReason: row.ban_reason ? String(row.ban_reason) : null,
    banDate: row.ban_date ? String(row.ban_date) : null,
    banExpiresAt: row.ban_expires_at ? String(row.ban_expires_at) : null,
    banAdminName: row.ban_admin_name ? String(row.ban_admin_name) : null,
    banAdminAccountId: Number(row.ban_admin_account_id ?? 0)
  };
}

export class AccountRepository {
  async emailExists(email: string) {
    const result = await getPool().query("SELECT 1 FROM accounts WHERE LOWER(email) = LOWER($1) LIMIT 1;", [email.trim()]);
    return (result.rowCount ?? 0) > 0;
  }

  async socialClubExists(socialClubId: string) {
    const result = await getPool().query("SELECT 1 FROM accounts WHERE LOWER(social_club_id) = LOWER($1) LIMIT 1;", [socialClubId.trim()]);
    return (result.rowCount ?? 0) > 0;
  }

  async getById(accountId: number) {
    const result = await getPool().query("SELECT * FROM accounts WHERE account_id = $1 LIMIT 1;", [accountId]);
    return result.rows[0] ? mapAccount(result.rows[0]) : null;
  }

  async getByEmail(email: string) {
    const result = await getPool().query("SELECT * FROM accounts WHERE LOWER(email) = LOWER($1) LIMIT 1;", [email.trim()]);
    return result.rows[0] ? mapAccount(result.rows[0]) : null;
  }

  async getBySocialClubId(socialClubId: string) {
    const result = await getPool().query("SELECT * FROM accounts WHERE LOWER(social_club_id) = LOWER($1) LIMIT 1;", [socialClubId.trim()]);
    return result.rows[0] ? mapAccount(result.rows[0]) : null;
  }

  async create(account: Omit<Account, "accountId">) {
    const result = await getPool().query(
      `
        INSERT INTO accounts (
          first_name, last_name, email, social_club_name, social_club_id, password_hash, password_salt,
          character_created, birth_date, origin, customization_json, admin_level, cash, bank_cash,
          health, armor, dimension, pos_x, pos_y, pos_z, rot_z, is_banned, ban_reason,
          ban_date, ban_expires_at, ban_admin_name, ban_admin_account_id
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7,
          $8, $9, $10, $11, $12, $13, $14,
          $15, $16, $17, $18, $19, $20, $21, $22, $23,
          $24, $25, $26, $27
        )
        RETURNING *;
      `,
      [
        account.firstName,
        account.lastName,
        account.email,
        account.socialClubName,
        account.socialClubId,
        account.passwordHash,
        account.passwordSalt,
        account.characterCreated,
        account.birthDate,
        account.origin,
        account.customizationJson,
        account.adminLevel,
        account.cash,
        account.bankCash,
        account.health,
        account.armor,
        account.dimension,
        account.posX,
        account.posY,
        account.posZ,
        account.rotZ,
        account.isBanned,
        account.banReason,
        account.banDate,
        account.banExpiresAt,
        account.banAdminName,
        account.banAdminAccountId
      ]
    );

    return mapAccount(result.rows[0]);
  }

  async getPersonalOutfits(accountId: number) {
    const result = await getPool().query(
      "SELECT outfit_id, account_id, name, clothing_json, created_at FROM personal_outfits WHERE account_id = $1 ORDER BY created_at ASC;",
      [accountId]
    );
    return result.rows.map((row) => ({
      outfitId: Number(row.outfit_id),
      accountId: Number(row.account_id),
      name: String(row.name),
      clothingJson: String(row.clothing_json),
      createdAt: String(row.created_at)
    }));
  }

  async getPersonalOutfitById(outfitId: number, accountId: number) {
    const result = await getPool().query(
      "SELECT outfit_id, account_id, name, clothing_json, created_at FROM personal_outfits WHERE outfit_id = $1 AND account_id = $2 LIMIT 1;",
      [outfitId, accountId]
    );
    if (!result.rows[0]) return null;
    const row = result.rows[0];
    return {
      outfitId: Number(row.outfit_id),
      accountId: Number(row.account_id),
      name: String(row.name),
      clothingJson: String(row.clothing_json),
      createdAt: String(row.created_at)
    };
  }

  async countPersonalOutfits(accountId: number) {
    const result = await getPool().query(
      "SELECT COUNT(*) FROM personal_outfits WHERE account_id = $1;",
      [accountId]
    );
    return parseInt(result.rows[0].count, 10);
  }

  async createPersonalOutfit(accountId: number, name: string, clothingJson: string) {
    const result = await getPool().query(
      "INSERT INTO personal_outfits (account_id, name, clothing_json) VALUES ($1, $2, $3) RETURNING outfit_id, account_id, name, clothing_json, created_at;",
      [accountId, name, clothingJson]
    );
    const row = result.rows[0];
    return {
      outfitId: Number(row.outfit_id),
      accountId: Number(row.account_id),
      name: String(row.name),
      clothingJson: String(row.clothing_json),
      createdAt: String(row.created_at)
    };
  }

  async deletePersonalOutfit(outfitId: number, accountId: number) {
    const result = await getPool().query(
      "DELETE FROM personal_outfits WHERE outfit_id = $1 AND account_id = $2;",
      [outfitId, accountId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  async save(account: Account) {
    const result = await getPool().query(
      `
        UPDATE accounts
        SET
          first_name = $2,
          last_name = $3,
          email = $4,
          social_club_name = $5,
          social_club_id = $6,
          password_hash = $7,
          password_salt = $8,
          character_created = $9,
          birth_date = $10,
          origin = $11,
          customization_json = $12,
          admin_level = $13,
          cash = $14,
          bank_cash = $15,
          health = $16,
          armor = $17,
          dimension = $18,
          pos_x = $19,
          pos_y = $20,
          pos_z = $21,
          rot_z = $22,
          is_banned = $23,
          ban_reason = $24,
          ban_date = $25,
          ban_expires_at = $26,
          ban_admin_name = $27,
          ban_admin_account_id = $28
        WHERE account_id = $1
        RETURNING *;
      `,
      [
        account.accountId,
        account.firstName,
        account.lastName,
        account.email,
        account.socialClubName,
        account.socialClubId,
        account.passwordHash,
        account.passwordSalt,
        account.characterCreated,
        account.birthDate,
        account.origin,
        account.customizationJson,
        account.adminLevel,
        account.cash,
        account.bankCash,
        account.health,
        account.armor,
        account.dimension,
        account.posX,
        account.posY,
        account.posZ,
        account.rotZ,
        account.isBanned,
        account.banReason,
        account.banDate,
        account.banExpiresAt,
        account.banAdminName,
        account.banAdminAccountId
      ]
    );

    return mapAccount(result.rows[0]);
  }
}
