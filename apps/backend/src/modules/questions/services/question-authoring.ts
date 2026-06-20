import { randomUUID } from "node:crypto";

import type { Pool } from "mysql2/promise";

import type { CanonicalImportQuestionOption } from "@utbk/shared/imports";

import type { Logger } from "../../../lib/logger";
import { syncPackageInvalidationByQuestion } from "../../packages/services/package-authoring";
import { TopicRepository } from "../../topics/repositories/topic-repository";
import {
  QuestionAuthoringRepository,
  type QuestionListFilters,
} from "../repositories/question-authoring-repository";

type QuestionInput = {
  topicSlug: string;
  type: "single_choice" | "multiple_response";
  source?: string;
  difficulty: "easy" | "medium" | "hard";
  status?: "draft" | "published";
  questionText: string;
  explanationText: string;
  options: CanonicalImportQuestionOption[];
};

export async function listQuestions(pool: Pool, filters: QuestionListFilters) {
  return new QuestionAuthoringRepository(pool).list(filters);
}

export async function createQuestion({
  pool,
  logger,
  input,
}: {
  pool: Pool;
  logger: Logger;
  input: QuestionInput;
}) {
  await assertTopicUsable(pool, input.topicSlug);
  const status = input.status ?? "draft";

  validateQuestionForStatus({
    ...input,
    source: input.source?.trim() || "manual:web",
    status,
  });

  const repository = new QuestionAuthoringRepository(pool);
  const question = await repository.create({
    externalId: generateInternalExternalId(),
    topicSlug: input.topicSlug,
    type: input.type,
    source: input.source?.trim() || "manual:web",
    difficulty: input.difficulty,
    status,
    questionText: input.questionText.trim(),
    explanationText: input.explanationText.trim(),
    options: normalizeOptions(input.options),
  });

  logger.info("questions.created", {
    externalId: question?.externalId,
    status,
  });

  if (question) {
    await syncPackageInvalidationByQuestion({
      pool,
      logger,
      questionExternalId: question.externalId,
    });
  }

  return question;
}

export async function updateQuestion({
  pool,
  logger,
  externalId,
  input,
}: {
  pool: Pool;
  logger: Logger;
  externalId: string;
  input: QuestionInput;
}) {
  const repository = new QuestionAuthoringRepository(pool);
  const existing = await repository.findByExternalId(externalId);

  if (!existing) {
    throw new Error("Question not found.");
  }

  await assertTopicUsable(pool, input.topicSlug);
  const status = input.status ?? existing.status;

  validateQuestionForStatus({
    ...input,
    source: input.source?.trim() || "manual:web",
    status,
  });

  const question = await repository.update(externalId, {
    topicSlug: input.topicSlug,
    type: input.type,
    source: input.source?.trim() || "manual:web",
    difficulty: input.difficulty,
    status,
    questionText: input.questionText.trim(),
    explanationText: input.explanationText.trim(),
    options: normalizeOptions(input.options),
  });

  logger.info("questions.updated", { externalId, status });

  await syncPackageInvalidationByQuestion({
    pool,
    logger,
    questionExternalId: externalId,
  });

  return question;
}

export async function archiveQuestion({
  pool,
  logger,
  externalId,
}: {
  pool: Pool;
  logger: Logger;
  externalId: string;
}) {
  const repository = new QuestionAuthoringRepository(pool);
  const existing = await repository.findByExternalId(externalId);

  if (!existing) {
    throw new Error("Question not found.");
  }

  const question = await repository.update(externalId, {
    topicSlug: existing.topicSlug,
    type: existing.type,
    source: existing.source,
    difficulty: existing.difficulty,
    status: existing.status,
    questionText: existing.questionText,
    explanationText: existing.explanationText,
    options: existing.options,
    isArchived: true,
  });

  logger.info("questions.archived", { externalId });

  await syncPackageInvalidationByQuestion({
    pool,
    logger,
    questionExternalId: externalId,
  });

  return question;
}

export async function duplicateQuestion({
  pool,
  logger,
  externalId,
}: {
  pool: Pool;
  logger: Logger;
  externalId: string;
}) {
  const repository = new QuestionAuthoringRepository(pool);
  const existing = await repository.findByExternalId(externalId);

  if (!existing) {
    throw new Error("Question not found.");
  }

  const duplicated = await repository.create({
    externalId: generateInternalExternalId(),
    topicSlug: existing.topicSlug,
    type: existing.type,
    source: existing.source,
    difficulty: existing.difficulty,
    status: "draft",
    questionText: existing.questionText,
    explanationText: existing.explanationText,
    options: existing.options,
  });

  logger.info("questions.duplicated", {
    sourceExternalId: externalId,
    duplicatedExternalId: duplicated?.externalId,
  });

  if (duplicated) {
    await syncPackageInvalidationByQuestion({
      pool,
      logger,
      questionExternalId: duplicated.externalId,
    });
  }

  return duplicated;
}

export async function publishQuestion({
  pool,
  logger,
  externalId,
}: {
  pool: Pool;
  logger: Logger;
  externalId: string;
}) {
  const repository = new QuestionAuthoringRepository(pool);
  const existing = await repository.findByExternalId(externalId);

  if (!existing) {
    throw new Error("Question not found.");
  }

  validateQuestionForStatus({
    topicSlug: existing.topicSlug,
    type: existing.type,
    source: existing.source,
    difficulty: existing.difficulty,
    status: "published",
    questionText: existing.questionText,
    explanationText: existing.explanationText,
    options: existing.options,
  });

  const question = await repository.update(externalId, {
    topicSlug: existing.topicSlug,
    type: existing.type,
    source: existing.source,
    difficulty: existing.difficulty,
    status: "published",
    questionText: existing.questionText,
    explanationText: existing.explanationText,
    options: existing.options,
  });

  logger.info("questions.published", { externalId });

  await syncPackageInvalidationByQuestion({
    pool,
    logger,
    questionExternalId: externalId,
  });

  return question;
}

export async function bulkQuestionAction({
  pool,
  logger,
  action,
  externalIds,
}: {
  pool: Pool;
  logger: Logger;
  action: "publish" | "archive" | "draft";
  externalIds: string[];
}) {
  const successes: string[] = [];
  const failures: Array<{ externalId: string; message: string }> = [];

  for (const externalId of externalIds) {
    try {
      if (action === "publish") {
        await publishQuestion({ pool, logger, externalId });
      } else if (action === "archive") {
        await archiveQuestion({ pool, logger, externalId });
      } else {
        await setQuestionDraft({ pool, logger, externalId });
      }

      successes.push(externalId);
    } catch (error) {
      failures.push({
        externalId,
        message: error instanceof Error ? error.message : "Unknown bulk action error.",
      });
    }
  }

  return {
    action,
    successes,
    failures,
  };
}

async function setQuestionDraft({
  pool,
  logger,
  externalId,
}: {
  pool: Pool;
  logger: Logger;
  externalId: string;
}) {
  const repository = new QuestionAuthoringRepository(pool);
  const existing = await repository.findByExternalId(externalId);

  if (!existing) {
    throw new Error("Question not found.");
  }

  await repository.update(externalId, {
    topicSlug: existing.topicSlug,
    type: existing.type,
    source: existing.source,
    difficulty: existing.difficulty,
    status: "draft",
    questionText: existing.questionText,
    explanationText: existing.explanationText,
    options: existing.options,
  });

  logger.info("questions.set_draft", { externalId });

  await syncPackageInvalidationByQuestion({
    pool,
    logger,
    questionExternalId: externalId,
  });
}

async function assertTopicUsable(pool: Pool, topicSlug: string) {
  const topic = await new TopicRepository(pool).findBySlug(topicSlug);

  if (!topic || topic.isArchived) {
    throw new Error("Active topic is required for question authoring.");
  }
}

function validateQuestionForStatus(input: Required<QuestionInput>) {
  if (input.questionText.trim().length === 0) {
    throw new Error("Question text is required.");
  }

  if (input.options.length < 2) {
    throw new Error("Question must have at least two options.");
  }

  const optionKeys = new Set<string>();

  for (const option of input.options) {
    if (option.option_text.trim().length === 0) {
      throw new Error("Question option text is required.");
    }

    if (optionKeys.has(option.option_key)) {
      throw new Error("Question option keys must be unique.");
    }

    optionKeys.add(option.option_key);
  }

  const correctCount = input.options.filter((option) => option.is_correct).length;

  if (input.type === "single_choice" && correctCount !== 1) {
    throw new Error("single_choice question must have exactly one correct option.");
  }

  if (input.type === "multiple_response" && correctCount < 2) {
    throw new Error("multiple_response question must have at least two correct options.");
  }

  if (input.status === "published" && input.explanationText.trim().length === 0) {
    throw new Error("Published question must include explanation text.");
  }
}

function normalizeOptions(options: CanonicalImportQuestionOption[]) {
  return options.map((option) => ({
    option_key: option.option_key.trim(),
    option_text: option.option_text.trim(),
    is_correct: option.is_correct,
  }));
}

function generateInternalExternalId() {
  return `manual_${randomUUID().replace(/-/g, "")}`;
}
