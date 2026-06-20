import { describe, expect, it } from "vitest";

import { getTestPool } from "../../lib/testing/test-database";
import { testLogger } from "../../lib/testing/test-logger";
import { bootstrapAdmin } from "../../modules/auth/services/bootstrap-admin";
import { changeAdminPassword } from "../../modules/auth/services/change-admin-password";
import { loginAdmin } from "../../modules/auth/services/login-admin";

describe("changeAdminPassword", () => {
  it("rejects the old password and accepts the new password after change", async () => {
    const pool = await getTestPool();

    await bootstrapAdmin({
      pool,
      logger: testLogger,
      username: "admin",
      password: "password123",
    });

    await changeAdminPassword({
      pool,
      logger: testLogger,
      username: "admin",
      currentPassword: "password123",
      newPassword: "password456",
    });

    await expect(
      loginAdmin({
        pool,
        logger: testLogger,
        username: "admin",
        password: "password123",
        ttlHours: 12,
      }),
    ).rejects.toThrow("Invalid credentials.");

    const login = await loginAdmin({
      pool,
      logger: testLogger,
      username: "admin",
      password: "password456",
      ttlHours: 12,
    });

    expect(login.adminUsername).toBe("admin");
  });
});
