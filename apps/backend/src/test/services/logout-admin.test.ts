import { describe, expect, it } from "vitest";

import { createApp } from "../../app/create-app";
import { getTestPool } from "../../lib/testing/test-database";
import { testLogger } from "../../lib/testing/test-logger";
import { bootstrapAdmin } from "../../modules/auth/services/bootstrap-admin";
import { loginAdmin } from "../../modules/auth/services/login-admin";
import { logoutAdmin } from "../../modules/auth/services/logout-admin";

describe("logoutAdmin", () => {
  it("revokes the session so it can no longer access protected routes", async () => {
    const pool = await getTestPool();

    await bootstrapAdmin({
      pool,
      logger: testLogger,
      username: "admin",
      password: "password123",
    });

    const login = await loginAdmin({
      pool,
      logger: testLogger,
      username: "admin",
      password: "password123",
      ttlHours: 12,
    });

    await logoutAdmin({
      pool,
      logger: testLogger,
      sessionToken: login.sessionToken,
    });

    const app = createApp({ logger: testLogger, pool });
    const response = await app.request("/api/protected", {
      headers: {
        Cookie: `session_token=${login.sessionToken}`,
      },
    });

    expect(response.status).toBe(401);
  });
});
