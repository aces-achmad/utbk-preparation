import { describe, expect, it } from "vitest";

import { createApp } from "../../app/create-app";
import { getTestPool } from "../../lib/testing/test-database";
import { testLogger } from "../../lib/testing/test-logger";
import { bootstrapAdmin } from "../../modules/auth/services/bootstrap-admin";
import { loginAdmin } from "../../modules/auth/services/login-admin";

describe("protected routes", () => {
  it("rejects requests without a valid session", async () => {
    const app = createApp({ logger: testLogger });

    const response = await app.request("/api/protected");
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload.success).toBe(false);
    expect(payload.message).toBe("Authentication required.");
  });

  it("allows requests with a valid session", async () => {
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

    const app = createApp({ logger: testLogger, pool });
    const response = await app.request("/api/protected", {
      headers: {
        Cookie: `session_token=${login.sessionToken}`,
      },
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.message).toBe("Authenticated.");
  });
});
