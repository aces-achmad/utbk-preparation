import { z } from "zod";

const frontendEnvSchema = z.object({
  VITE_APP_NAME: z.string().default("UTBK Preparation"),
  VITE_API_BASE_PATH: z.string().default("/api"),
});

export const appEnv = frontendEnvSchema.parse(import.meta.env);

