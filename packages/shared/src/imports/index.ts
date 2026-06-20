import { z } from "zod";

export const questionTypeSchema = z.enum(["single_choice", "multiple_response"]);
export const difficultySchema = z.enum(["easy", "medium", "hard"]);
export const questionStatusSchema = z.enum(["draft", "published"]);

export const canonicalImportPayloadSchema = z.object({
  schema_version: z.string(),
  subjects: z.array(z.unknown()),
  topics: z.array(z.unknown()),
  questions: z.array(z.unknown()).max(500),
});

export type CanonicalImportPayload = z.infer<typeof canonicalImportPayloadSchema>;

