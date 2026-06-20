import { createApp } from "./app/create-app";
import { loadEnv } from "./config/env";
import { applyMigrations } from "./db/migration-runner";
import { createPool } from "./db/mysql";
import { createLogger } from "./lib/logger";
import { bootstrapAdmin } from "./modules/auth/services/bootstrap-admin";

const env = loadEnv();
const logger = createLogger({ service: "backend" });
const pool = createPool(env.DATABASE_URL);

logger.info("backend.starting", {
  port: env.APP_PORT,
  origin: env.APP_ORIGIN,
});

await applyMigrations(pool);
await bootstrapAdmin({
  pool,
  logger,
  username: env.ADMIN_USERNAME,
  password: env.ADMIN_PASSWORD,
});

const app = createApp({ logger, pool });

Bun.serve({
  fetch: app.fetch,
  port: env.APP_PORT,
});

logger.info("backend.ready", {
  port: env.APP_PORT,
});
