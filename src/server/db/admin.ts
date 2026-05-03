import { pool } from "./pool";

export interface AdminCommandPermission {
  command: string;
  minLevel: number;
}

function mapPermission(row: any): AdminCommandPermission {
  return {
    command: row.command,
    minLevel: row.min_level
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
