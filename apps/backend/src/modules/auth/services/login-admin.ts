import { randomBytes } from "node:crypto";
import type { Pool } from "mysql2/promise";

import type { Logger } from "../../../lib/logger";
import { verifyPassword } from "../lib/password";
import { AuthRepository } from "../repositories/auth-repository";

type LoginAdminOptions = {
  pool: Pool;
  logger: Logger;
  username: string;
  password: string;
  ttlHours: number;
};

export async function loginAdmin({
  pool,
  logger,
  username,
  password,
  ttlHours,
}: LoginAdminOptions) {
  const repository = new AuthRepository(pool);
  const normalizedUsername = username.trim();
  const adminUser = await repository.findAdminByUsername(normalizedUsername);

  if (!adminUser || !verifyPassword(password, adminUser.password_hash)) {
    throw new Error("Invalid credentials.");
  }

  const sessionToken = randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000);

  await repository.createSession(adminUser.id, sessionToken, expiresAt);

  logger.info("auth.login.created_session", {
    adminUserId: adminUser.id,
    username: adminUser.username,
  });

  return {
    adminUserId: adminUser.id,
    adminUsername: adminUser.username,
    sessionToken,
    expiresAt,
  };
}
