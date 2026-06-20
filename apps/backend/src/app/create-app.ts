import { Hono } from "hono";
import { requestId } from "hono/request-id";

import type { Logger } from "../lib/logger";

type CreateAppOptions = {
  logger: Logger;
};

export function createApp({ logger }: CreateAppOptions) {
  const app = new Hono();

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

  return app;
}

