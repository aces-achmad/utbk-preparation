import { createApp } from "./app/create-app";
import { loadEnv } from "./config/env";
import { createLogger } from "./lib/logger";

const env = loadEnv();
const logger = createLogger({ service: "backend" });
const app = createApp({ logger });

logger.info("backend.starting", {
  port: env.APP_PORT,
  origin: env.APP_ORIGIN,
});

Bun.serve({
  fetch: app.fetch,
  port: env.APP_PORT,
});

logger.info("backend.ready", {
  port: env.APP_PORT,
});

