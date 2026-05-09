import { Pool } from "pg";
import { config } from "../config";

export const pool = new Pool({
  connectionString: config.databaseUrl,
  max: 10
});

export async function assertDatabaseConnection() {
  await pool.query("SELECT 1");
}
