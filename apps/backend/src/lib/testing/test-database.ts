import type { Pool } from "mysql2/promise";

import { loadTestEnv } from "../../config/env";
import { createPool } from "../../db/mysql";
import { applyMigrations } from "../../db/migration-runner";

let testPool: Pool | null = null;

export async function getTestPool() {
  if (testPool) {
    return testPool;
  }

  const env = loadTestEnv();
  testPool = createPool(env.TEST_DATABASE_URL);
  await applyMigrations(testPool);

  return testPool;
}

export async function resetDatabase() {
  const pool = await getTestPool();

  await pool.query("SET FOREIGN_KEY_CHECKS = 0");
  await pool.query("TRUNCATE TABLE attempt_answers");
  await pool.query("TRUNCATE TABLE attempt_question_snapshots");
  await pool.query("TRUNCATE TABLE attempts");
  await pool.query("TRUNCATE TABLE question_package_items");
  await pool.query("TRUNCATE TABLE question_packages");
  await pool.query("TRUNCATE TABLE import_sessions");
  await pool.query("TRUNCATE TABLE questions");
  await pool.query("TRUNCATE TABLE topics");
  await pool.query("TRUNCATE TABLE subjects");
  await pool.query("TRUNCATE TABLE auth_sessions");
  await pool.query("TRUNCATE TABLE admin_users");
  await pool.query("TRUNCATE TABLE test_probe_records");
  await pool.query("SET FOREIGN_KEY_CHECKS = 1");
}

export async function closeTestPool() {
  if (!testPool) {
    return;
  }

  await testPool.end();
  testPool = null;
}
