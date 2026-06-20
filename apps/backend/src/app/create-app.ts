import { Hono } from "hono";
import { deleteCookie, setCookie } from "hono/cookie";
import { requestId } from "hono/request-id";
import type { Pool } from "mysql2/promise";
import { z } from "zod";

import type { Logger } from "../lib/logger";
import { requireSession } from "../middleware/require-session";
import { AuthRepository } from "../modules/auth/repositories/auth-repository";
import type { SessionRecord } from "../modules/auth/repositories/session-repository";
import { changeAdminPassword } from "../modules/auth/services/change-admin-password";
import { loginAdmin } from "../modules/auth/services/login-admin";
import { logoutAdmin } from "../modules/auth/services/logout-admin";

type CreateAppOptions = {
  logger: Logger;
  pool?: Pool;
};

export function createApp({ logger, pool }: CreateAppOptions) {
  const app = new Hono<{
    Variables: {
      requestId: string;
      session: SessionRecord;
    };
  }>();
  const loginSchema = z.object({
    username: z.string().min(1),
    password: z.string().min(1),
  });
  const changePasswordSchema = z.object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8),
  });

  app.use("*", requestId());

  app.use("*", async (c, next) => {
    const startedAt = Date.now();

    await next();

    logger.info("http.request", {
      method: c.req.method,
      path: c.req.path,
      status: c.res.status,
      requestId: c.get("requestId"),
      durationMs: Date.now() - startedAt,
    });
  });

  app.get("/", (c) =>
    c.json({
      success: true,
      message: "UTBK Preparation backend is running.",
      data: {
        service: "backend",
      },
    }),
  );

  app.get("/api/health", (c) =>
    c.json({
      success: true,
      message: "OK",
      data: {
        status: "ok",
      },
    }),
  );

  app.post("/api/auth/login", async (c) => {
    if (!pool) {
      return c.json(
        {
          success: false,
          message: "Application database is not configured.",
          data: null,
        },
        500,
      );
    }

    const payload = loginSchema.parse(await c.req.json());
    try {
      const result = await loginAdmin({
        pool,
        logger,
        username: payload.username,
        password: payload.password,
        ttlHours: 12,
      });

      setCookie(c, "session_token", result.sessionToken, {
        httpOnly: true,
        path: "/",
        sameSite: "Lax",
      });

      return c.json({
        success: true,
        message: "Login successful.",
        data: {
          adminUserId: result.adminUserId,
          adminUsername: result.adminUsername,
        },
      });
    } catch (error) {
      if (error instanceof Error && error.message === "Invalid credentials.") {
        return c.json(
          {
            success: false,
            message: "Invalid credentials.",
            data: null,
          },
          401,
        );
      }

      throw error;
    }
  });

  app.post("/api/auth/logout", requireSession({ pool }), async (c) => {
    const session = c.get("session") as SessionRecord;

    await logoutAdmin({
      pool: pool!,
      logger,
      sessionToken: session.session_token,
    });

    deleteCookie(c, "session_token", {
      path: "/",
    });

    return c.json({
      success: true,
      message: "Logout successful.",
      data: null,
    });
  });

  app.post("/api/auth/change-password", requireSession({ pool }), async (c) => {
    const session = c.get("session") as SessionRecord;
    const payload = changePasswordSchema.parse(await c.req.json());
    const authRepository = new AuthRepository(pool!);
    const adminUser = await authRepository.findAdminById(session.admin_user_id);

    if (!adminUser) {
      return c.json(
        {
          success: false,
          message: "Authentication required.",
          data: null,
        },
        401,
      );
    }

    await changeAdminPassword({
      pool: pool!,
      logger,
      username: adminUser.username,
      currentPassword: payload.currentPassword,
      newPassword: payload.newPassword,
    });

    return c.json({
      success: true,
      message: "Password changed.",
      data: null,
    });
  });

  app.get("/api/protected", requireSession({ pool }), (c) =>
    c.json({
      success: true,
      message: "Authenticated.",
      data: {
        ok: true,
      },
    }),
  );

  return app;
}
