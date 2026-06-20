import type { RowDataPacket } from "mysql2/promise";
import { describe, expect, it } from "vitest";

import { getTestPool } from "../../lib/testing/test-database";
import { testLogger } from "../../lib/testing/test-logger";
import { bootstrapAdmin } from "../../modules/auth/services/bootstrap-admin";

type AdminUserRow = RowDataPacket & {
  username: string;
};

describe("bootstrapAdmin", () => {
  it("creates the bootstrap Admin once and avoids duplicates on repeat runs", async () => {
    const pool = await getTestPool();

    await bootstrapAdmin({
      pool,
      logger: testLogger,
      username: "admin",
      password: "super-secret-password",
    });

    await bootstrapAdmin({
      pool,
      logger: testLogger,
      username: "admin",
      password: "super-secret-password",
    });

    const [rows] = await pool.query<AdminUserRow[]>(
      "SELECT username FROM admin_users ORDER BY id ASC",
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]?.username).toBe("admin");
  });
});
