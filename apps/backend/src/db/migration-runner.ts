import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import type { Pool, RowDataPacket } from "mysql2/promise";

const MIGRATIONS_DIR = join(fileURLToPath(new URL("./migrations", import.meta.url)));
const MIGRATIONS_TABLE = "_app_migrations";

export async function applyMigrations(pool: Pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      filename VARCHAR(255) NOT NULL UNIQUE,
      applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const [appliedRows] = await pool.query<Array<RowDataPacket & { filename: string }>>(
    `SELECT filename FROM ${MIGRATIONS_TABLE}`,
  );
  const applied = new Set(appliedRows.map((row) => row.filename));

  const files = (await readdir(MIGRATIONS_DIR))
    .filter((file) => file.endsWith(".sql"))
    .sort();

  for (const file of files) {
    if (applied.has(file)) {
      continue;
    }

    const sql = await readFile(join(MIGRATIONS_DIR, file), "utf8");
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      for (const statement of splitSqlStatements(sql)) {
        await connection.query(statement);
      }

      await connection.query(`INSERT INTO ${MIGRATIONS_TABLE} (filename) VALUES (?)`, [file]);
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
}

function splitSqlStatements(sql: string) {
  return sql
    .split(/;\s*$/m)
    .join(";")
    .split(";")
    .map((statement) => statement.trim())
    .filter(Boolean);
}
