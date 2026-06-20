import { getCookie } from "hono/cookie";
import type { MiddlewareHandler } from "hono";
import type { Pool } from "mysql2/promise";

import { validateSession } from "../modules/auth/services/validate-session";

type RequireSessionOptions = {
  pool?: Pool;
};

export function requireSession({ pool }: RequireSessionOptions): MiddlewareHandler {
  return async (c, next) => {
    const sessionToken = getCookie(c, "session_token");

    if (!sessionToken || !pool) {
      return c.json(
        {
          success: false,
          message: "Authentication required.",
          data: null,
        },
        401,
      );
    }

    const session = await validateSession(pool, sessionToken);

    if (!session) {
      return c.json(
        {
          success: false,
          message: "Authentication required.",
          data: null,
        },
        401,
      );
    }

    c.set("session", session);

    await next();
  };
}
