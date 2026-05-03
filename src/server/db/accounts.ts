import { pool } from "./pool";

export interface AccountRecord {
  id: number;
  socialClubId: string;
  socialClubName: string;
  email: string;
  passwordHash: string;
  uniqueCoins: number;
  adminLevel: number;
}

function mapAccount(row: any): AccountRecord {
  return {
    id: row.id,
    socialClubId: row.social_club_id,
    socialClubName: row.social_club_name,
    email: row.email,
    passwordHash: row.password_hash,
    uniqueCoins: row.unique_coins,
    adminLevel: row.admin_level ?? 0
  };
}

export async function findAccountBySocialClubId(socialClubId: string) {
  const result = await pool.query("SELECT * FROM accounts WHERE social_club_id = $1", [socialClubId]);
  return result.rows[0] ? mapAccount(result.rows[0]) : null;
}

export async function findAccountByEmail(email: string) {
  const result = await pool.query("SELECT * FROM accounts WHERE lower(email) = lower($1)", [email]);
  return result.rows[0] ? mapAccount(result.rows[0]) : null;
}

export async function listAdminAccounts() {
  const result = await pool.query(
    "SELECT * FROM accounts WHERE admin_level > 0 ORDER BY admin_level DESC, social_club_name ASC"
  );
  return result.rows.map(mapAccount);
}

export async function createAccount(input: {
  socialClubId: string;
  socialClubName: string;
  email: string;
  passwordHash: string;
}) {
  const result = await pool.query(
    `
      INSERT INTO accounts (social_club_id, social_club_name, email, password_hash)
      VALUES ($1, $2, lower($3), $4)
      RETURNING *
    `,
    [input.socialClubId, input.socialClubName, input.email, input.passwordHash]
  );

  return mapAccount(result.rows[0]);
}

export async function setAccountUniqueCoins(accountId: number, amount: number) {
  const result = await pool.query("UPDATE accounts SET unique_coins = $2, updated_at = NOW() WHERE id = $1 RETURNING *", [
    accountId,
    amount
  ]);
  return result.rows[0] ? mapAccount(result.rows[0]) : null;
}

export async function setAccountAdminLevel(accountId: number, level: number) {
  const result = await pool.query("UPDATE accounts SET admin_level = $2, updated_at = NOW() WHERE id = $1 RETURNING *", [
    accountId,
    level
  ]);
  return result.rows[0] ? mapAccount(result.rows[0]) : null;
}
