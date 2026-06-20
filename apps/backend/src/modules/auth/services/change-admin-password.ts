import type { Pool } from "mysql2/promise";

import type { Logger } from "../../../lib/logger";
import { hashPassword, verifyPassword } from "../lib/password";
import { AuthRepository } from "../repositories/auth-repository";

type ChangeAdminPasswordOptions = {
  pool: Pool;
  logger: Logger;
  username: string;
  currentPassword: string;
  newPassword: string;
};

export async function changeAdminPassword({
  pool,
  logger,
  username,
  currentPassword,
  newPassword,
}: ChangeAdminPasswordOptions) {
  const repository = new AuthRepository(pool);
  const normalizedUsername = username.trim();
  const adminUser = await repository.findAdminByUsername(normalizedUsername);

  if (!adminUser || !verifyPassword(currentPassword, adminUser.password_hash)) {
    throw new Error("Invalid credentials.");
  }

  const nextPasswordHash = hashPassword(newPassword);

  await repository.updatePasswordHash(adminUser.id, nextPasswordHash);

  logger.info("auth.change_password.updated", {
    adminUserId: adminUser.id,
    username: adminUser.username,
  });
}
