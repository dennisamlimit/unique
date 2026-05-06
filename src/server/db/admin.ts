import { pool } from "./pool";

export interface AdminCommandPermission {
  command: string;
  minLevel: number;
}

export interface AdminLogRecord {
  id: number;
  adminAccountId: number | null;
  adminCharacterId: number | null;
  adminName: string;
  command: string;
  rawArgs: string;
  details: string | null;
  success: boolean;
  createdAt: Date;
}

function mapPermission(row: any): AdminCommandPermission {
  return {
    command: row.command,
    minLevel: row.min_level
  };
}

function mapAdminLog(row: any): AdminLogRecord {
  return {
    id: row.id,
    adminAccountId: row.admin_account_id ?? null,
    adminCharacterId: row.admin_character_id ?? null,
    adminName: row.admin_name,
    command: row.command,
    rawArgs: row.raw_args ?? "",
    details: row.details ?? null,
    success: Boolean(row.success),
    createdAt: row.created_at
  };
}

export async function listAdminCommandPermissions() {
  const result = await pool.query("SELECT * FROM admin_command_permissions ORDER BY command ASC");
  return result.rows.map(mapPermission);
}

export async function getAdminCommandPermission(command: string) {
  const result = await pool.query("SELECT * FROM admin_command_permissions WHERE command = $1", [command]);
  return result.rows[0] ? mapPermission(result.rows[0]) : null;
}

export async function setAdminCommandPermission(command: string, minLevel: number) {
  const result = await pool.query(
    `
      INSERT INTO admin_command_permissions (command, min_level, updated_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (command)
      DO UPDATE SET min_level = EXCLUDED.min_level, updated_at = NOW()
      RETURNING *
    `,
    [command, minLevel]
  );
  return mapPermission(result.rows[0]);
}

export async function createAdminLog(input: {
  adminAccountId: number | null;
  adminCharacterId: number | null;
  adminName: string;
  command: string;
  rawArgs: string;
  details?: string | null;
  success?: boolean;
}) {
  const result = await pool.query(
    `
      INSERT INTO admin_logs (admin_account_id, admin_character_id, admin_name, command, raw_args, details, success)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `,
    [
      input.adminAccountId,
      input.adminCharacterId,
      input.adminName,
      input.command,
      input.rawArgs,
      input.details ?? null,
      input.success ?? true
    ]
  );
  return mapAdminLog(result.rows[0]);
}

export async function listAdminLogs(limit = 80) {
  const result = await pool.query(
    `
      SELECT *
      FROM admin_logs
      ORDER BY created_at DESC, id DESC
      LIMIT $1
    `,
    [Math.min(200, Math.max(1, Math.trunc(limit)))]
  );
  return result.rows.map(mapAdminLog);
}
