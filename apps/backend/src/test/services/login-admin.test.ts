import type { RowDataPacket } from "mysql2/promise";
import { describe, expect, it } from "vitest";

import { getTestPool } from "../../lib/testing/test-database";
import { testLogger } from "../../lib/testing/test-logger";
import { bootstrapAdmin } from "../../modules/auth/services/bootstrap-admin";
import { loginAdmin } from "../../modules/auth/services/login-admin";

type SessionRow = RowDataPacket & {
  admin_user_id: number;
};

describe("loginAdmin", () => {
  it("creates a persisted session for valid credentials", async () => {
    const pool = await getTestPool();

    await bootstrapAdmin({
      pool,
      logger: testLogger,
      username: "admin",
      password: "password123",
    });

    const result = await loginAdmin({
      pool,
      logger: testLogger,
      username: "admin",
      password: "password123",
      ttlHours: 12,
    });

    const [rows] = await pool.query<SessionRow[]>(
      "SELECT admin_user_id FROM auth_sessions ORDER BY id ASC",
    );

    expect(result.adminUsername).toBe("admin");
    expect(result.sessionToken.length).toBeGreaterThan(20);
    expect(rows).toHaveLength(1);
  });
});
