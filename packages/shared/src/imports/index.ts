import { z } from "zod";

export const questionTypeSchema = z.enum(["single_choice", "multiple_response"]);
export const difficultySchema = z.enum(["easy", "medium", "hard"]);
export const questionStatusSchema = z.enum(["draft", "published"]);

export const canonicalImportSchemaVersion = "1.0";

export const subjectImportSchema = z.object({
  slug: z.string().trim().min(1),
  label: z.string().trim().min(1),
  display_order: z.number().int().positive(),
});

export const topicImportSchema = z.object({
  slug: z.string().trim().min(1),
  subject_slug: z.string().trim().min(1),
  label: z.string().trim().min(1),
  display_order: z.number().int().positive(),
});

export const questionOptionImportSchema = z.object({
  option_key: z.string().trim().min(1),
  option_text: z.string().trim().min(1),
  is_correct: z.boolean(),
});

export const questionImportSchema = z.object({
  external_id: z.string().trim().min(1),
  topic_slug: z.string().trim().min(1),
  type: questionTypeSchema,
  source: z.string().trim().min(1),
  difficulty: difficultySchema,
  status: questionStatusSchema,
  question_text: z.string().trim().min(1),
  explanation_text: z.string(),
  options: z.array(questionOptionImportSchema).min(2),
});

export const canonicalImportPayloadSchema = z
  .object({
    schema_version: z.literal(canonicalImportSchemaVersion),
    subjects: z.array(subjectImportSchema),
    topics: z.array(topicImportSchema),
    questions: z.array(questionImportSchema).max(500),
  })
  .superRefine((payload, context) => {
    enforceUniqueStrings(payload.subjects.map((item) => item.slug), context, "subjects", "slug");
    enforceUniqueStrings(payload.topics.map((item) => item.slug), context, "topics", "slug");
    enforceUniqueStrings(
      payload.questions.map((item) => item.external_id),
      context,
      "questions",
      "external_id",
    );

    const subjectSlugs = new Set(payload.subjects.map((subject) => subject.slug));
    const topicSlugs = new Set(payload.topics.map((topic) => topic.slug));
    const usedTopicSlugs = new Set(payload.questions.map((question) => question.topic_slug));

    payload.topics.forEach((topic, index) => {
      if (!subjectSlugs.has(topic.subject_slug)) {
        context.addIssue({
          code: "custom",
          path: ["topics", index, "subject_slug"],
          message: "Topic subject_slug must reference a subject in the payload.",
        });
      }

      if (!usedTopicSlugs.has(topic.slug)) {
        context.addIssue({
          code: "custom",
          path: ["topics", index, "slug"],
          message: "Topic must be referenced by at least one question in the payload.",
        });
      }
    });

    payload.questions.forEach((question, index) => {
      if (!topicSlugs.has(question.topic_slug)) {
        context.addIssue({
          code: "custom",
          path: ["questions", index, "topic_slug"],
          message: "Question topic_slug must reference a topic in the payload.",
        });
      }

      if (question.status === "published" && question.explanation_text.trim().length === 0) {
        context.addIssue({
          code: "custom",
          path: ["questions", index, "explanation_text"],
          message: "Published question must include explanation_text.",
        });
      }

      enforceUniqueStrings(
        question.options.map((option) => option.option_key),
        context,
        "questions",
        "options",
        index,
      );

      const correctCount = question.options.filter((option) => option.is_correct).length;

      if (question.type === "single_choice" && correctCount !== 1) {
        context.addIssue({
          code: "custom",
          path: ["questions", index, "options"],
          message: "single_choice question must have exactly one correct option.",
        });
      }

      if (question.type === "multiple_response" && correctCount < 2) {
        context.addIssue({
          code: "custom",
          path: ["questions", index, "options"],
          message: "multiple_response question must have at least two correct options.",
        });
      }
    });
  });

export type CanonicalImportPayload = z.infer<typeof canonicalImportPayloadSchema>;
export type CanonicalImportSubject = z.infer<typeof subjectImportSchema>;
export type CanonicalImportTopic = z.infer<typeof topicImportSchema>;
export type CanonicalImportQuestion = z.infer<typeof questionImportSchema>;
export type CanonicalImportQuestionOption = z.infer<typeof questionOptionImportSchema>;

function enforceUniqueStrings(
  values: string[],
  context: z.RefinementCtx,
  collectionPath: string,
  fieldPath: string,
  questionIndex?: number,
) {
  const seen = new Map<string, number>();

  values.forEach((value, index) => {
    const duplicateIndex = seen.get(value);

    if (duplicateIndex !== undefined) {
      const basePath =
        questionIndex === undefined
          ? [collectionPath, index, fieldPath]
          : [collectionPath, questionIndex, fieldPath, index, "option_key"];

      context.addIssue({
        code: "custom",
        path: basePath,
        message: `Duplicate value '${value}' is not allowed.`,
      });
      return;
    }

    seen.set(value, index);
  });
}
