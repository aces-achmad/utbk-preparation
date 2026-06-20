import { describe, expect, it } from "vitest";

import { createApp } from "../../app/create-app";
import { getTestPool } from "../../lib/testing/test-database";
import { testLogger } from "../../lib/testing/test-logger";
import { bootstrapAdmin } from "../../modules/auth/services/bootstrap-admin";

describe("auth routes", () => {
  it("logs in with valid credentials and sets a session cookie", async () => {
    const pool = await getTestPool();

    await bootstrapAdmin({
      pool,
      logger: testLogger,
      username: "admin",
      password: "password123",
    });

    const app = createApp({ logger: testLogger, pool });
    const response = await app.request("/api/auth/login", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        username: "admin",
        password: "password123",
      }),
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.data.adminUsername).toBe("admin");
    expect(response.headers.get("set-cookie")).toContain("session_token=");
  });

  it("logs out by revoking the active session cookie", async () => {
    const pool = await getTestPool();

    await bootstrapAdmin({
      pool,
      logger: testLogger,
      username: "admin",
      password: "password123",
    });

    const app = createApp({ logger: testLogger, pool });
    const loginResponse = await app.request("/api/auth/login", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        username: "admin",
        password: "password123",
      }),
    });
    const sessionCookie = loginResponse.headers.get("set-cookie") ?? "";

    const logoutResponse = await app.request("/api/auth/logout", {
      method: "POST",
      headers: {
        Cookie: sessionCookie,
      },
    });

    expect(logoutResponse.status).toBe(200);

    const protectedResponse = await app.request("/api/protected", {
      headers: {
        Cookie: sessionCookie,
      },
    });

    expect(protectedResponse.status).toBe(401);
  });

  it("changes password and allows future login only with the new password", async () => {
    const pool = await getTestPool();

    await bootstrapAdmin({
      pool,
      logger: testLogger,
      username: "admin",
      password: "password123",
    });

    const app = createApp({ logger: testLogger, pool });
    const loginResponse = await app.request("/api/auth/login", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        username: "admin",
        password: "password123",
      }),
    });
    const sessionCookie = loginResponse.headers.get("set-cookie") ?? "";

    const changeResponse = await app.request("/api/auth/change-password", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Cookie: sessionCookie,
      },
      body: JSON.stringify({
        currentPassword: "password123",
        newPassword: "password456",
      }),
    });

    expect(changeResponse.status).toBe(200);

    const oldLogin = await app.request("/api/auth/login", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        username: "admin",
        password: "password123",
      }),
    });

    expect(oldLogin.status).toBe(401);

    const newLogin = await app.request("/api/auth/login", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        username: "admin",
        password: "password456",
      }),
    });

    expect(newLogin.status).toBe(200);
  });
});
