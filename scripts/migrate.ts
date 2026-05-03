import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL ?? "postgres://unique:unique@localhost:5432/unique";
const migrationsDir = path.resolve("database/migrations");

const pool = new Pool({ connectionString: databaseUrl });

async function main() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  const files = (await readdir(migrationsDir))
    .filter((file) => file.endsWith(".sql"))
    .sort((a, b) => a.localeCompare(b));

  for (const file of files) {
    const applied = await pool.query("SELECT 1 FROM schema_migrations WHERE filename = $1", [file]);
    if (applied.rowCount) {
      console.log(`skip ${file}`);
      continue;
    }

    const sql = await readFile(path.join(migrationsDir, file), "utf8");
    await pool.query("BEGIN");
    try {
      await pool.query(sql);
      await pool.query("INSERT INTO schema_migrations (filename) VALUES ($1)", [file]);
      await pool.query("COMMIT");
      console.log(`applied ${file}`);
    } catch (error) {
      await pool.query("ROLLBACK");
      throw error;
    }
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
