import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { z } from "zod";

const baseDatabaseEnvSchema = z.object({
  MYSQL_HOST: z.string().default("127.0.0.1"),
  MYSQL_PORT: z.coerce.number().int().positive().default(3306),
  MYSQL_DATABASE: z.string().min(1),
  MYSQL_USER: z.string().min(1),
  MYSQL_PASSWORD: z.string().min(1),
});

const appEnvSchema = z.object({
  APP_PORT: z.coerce.number().int().positive().default(3000),
  APP_ORIGIN: z.url().default("http://localhost:3000"),
  DATABASE_URL: z.string().min(1).optional(),
  SESSION_SECRET: z.string().min(16),
  ADMIN_USERNAME: z.string().min(1),
  ADMIN_PASSWORD: z.string().min(8),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
});

export type BackendEnv = z.infer<typeof appEnvSchema> & {
  DATABASE_URL: string;
};

export function loadEnv(): BackendEnv {
  const runtimeEnv = readRuntimeEnv();
  const appEnv = appEnvSchema.parse(runtimeEnv);

  return {
    ...appEnv,
    DATABASE_URL: appEnv.DATABASE_URL ?? buildDatabaseUrl(baseDatabaseEnvSchema.parse(runtimeEnv)),
  };
}

const testEnvSchema = z.object({
  TEST_DATABASE_URL: z.string().min(1).optional(),
  TEST_DATABASE_NAME: z.string().min(1).optional(),
});

export type BackendTestEnv = {
  TEST_DATABASE_URL: string;
};

export function loadTestEnv(): BackendTestEnv {
  const runtimeEnv = readRuntimeEnv();
  const testEnv = testEnvSchema.parse(runtimeEnv);

  if (testEnv.TEST_DATABASE_URL) {
    return {
      TEST_DATABASE_URL: testEnv.TEST_DATABASE_URL,
    };
  }

  const databaseEnv = baseDatabaseEnvSchema.parse(runtimeEnv);

  return {
    TEST_DATABASE_URL: buildDatabaseUrl({
      ...databaseEnv,
      MYSQL_DATABASE: testEnv.TEST_DATABASE_NAME ?? `${databaseEnv.MYSQL_DATABASE}_test`,
    }),
  };
}

function readRuntimeEnv() {
  const fileEnv = loadFileEnv();

  if (typeof Bun !== "undefined") {
    return {
      ...fileEnv,
      ...Bun.env,
    };
  }

  return {
    ...fileEnv,
    ...process.env,
  };
}

function buildDatabaseUrl(input: z.infer<typeof baseDatabaseEnvSchema>) {
  return `mysql://${encodeURIComponent(input.MYSQL_USER)}:${encodeURIComponent(input.MYSQL_PASSWORD)}@${input.MYSQL_HOST}:${input.MYSQL_PORT}/${input.MYSQL_DATABASE}`;
}

function loadFileEnv() {
  const envPath = join(fileURLToPath(new URL("../../../../.env", import.meta.url)));

  if (!existsSync(envPath)) {
    return {};
  }

  const contents = readFileSync(envPath, "utf8");

  return Object.fromEntries(
    contents
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith("#"))
      .map((line) => {
        const separatorIndex = line.indexOf("=");
        const key = line.slice(0, separatorIndex).trim();
        const value = line.slice(separatorIndex + 1).trim();
        return [key, value];
      }),
  );
}
