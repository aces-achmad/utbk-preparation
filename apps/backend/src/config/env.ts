import { z } from "zod";

const envSchema = z.object({
  APP_PORT: z.coerce.number().int().positive().default(3000),
  APP_ORIGIN: z.url().default("http://localhost:3000"),
  DATABASE_URL: z.string().min(1),
  SESSION_SECRET: z.string().min(16),
  ADMIN_USERNAME: z.string().min(1),
  ADMIN_PASSWORD: z.string().min(8),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
});

export type BackendEnv = z.infer<typeof envSchema>;

export function loadEnv(): BackendEnv {
  return envSchema.parse(readRuntimeEnv());
}

const testEnvSchema = z.object({
  TEST_DATABASE_URL: z.string().min(1),
});

export type BackendTestEnv = z.infer<typeof testEnvSchema>;

export function loadTestEnv(): BackendTestEnv {
  return testEnvSchema.parse(readRuntimeEnv());
}

function readRuntimeEnv() {
  if (typeof Bun !== "undefined") {
    return Bun.env;
  }

  return process.env;
}
