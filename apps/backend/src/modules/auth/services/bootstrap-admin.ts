import type { Pool, RowDataPacket } from "mysql2/promise";

import type { Logger } from "../../../lib/logger";
import { hashPassword } from "../lib/password";

type BootstrapAdminOptions = {
  pool: Pool;
  logger: Logger;
  username: string;
  password: string;
};

type AdminRow = RowDataPacket & {
  id: number;
};

export async function bootstrapAdmin({
  pool,
  logger,
  username,
  password,
}: BootstrapAdminOptions) {
  const normalizedUsername = username.trim();
  const passwordHash = hashPassword(password);

  const [existingRows] = await pool.query<AdminRow[]>(
    "SELECT id FROM admin_users WHERE username = ? LIMIT 1",
    [normalizedUsername],
  );

  if (existingRows.length > 0) {
    logger.info("auth.bootstrap_admin.skipped", {
      username: normalizedUsername,
    });
    return { created: false };
  }

  await pool.query(
    "INSERT INTO admin_users (username, password_hash) VALUES (?, ?)",
    [normalizedUsername, passwordHash],
  );

  logger.info("auth.bootstrap_admin.created", {
    username: normalizedUsername,
  });

  return { created: true };
}
