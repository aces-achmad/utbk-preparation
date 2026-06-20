import type { Pool } from "mysql2/promise";
import { ZodError } from "zod";

import {
  canonicalImportPayloadSchema,
  type CanonicalImportPayload,
} from "@utbk/shared/imports";

import type { Logger } from "../../../lib/logger";
import { ImportSessionRepository } from "../repositories/import-session-repository";
import { QuestionPreviewRepository } from "../repositories/question-preview-repository";

type PreviewImportInput = {
  pool: Pool;
  logger: Logger;
  adminUserId: number;
  originalFilename: string;
  rawPayload: string;
};

export type PreviewError = {
  path: string;
  message: string;
  code: string;
  recordType: "payload" | "subject" | "topic" | "question";
  recordIdentifier: string | null;
};

export type PreviewImportResult = {
  importSessionId: number;
  status: "preview_ready" | "preview_invalid";
  summary: {
    questionCount: number;
    insertCount: number;
    updateCount: number;
    invalidRecordCount: number;
    sensitiveUpdateCount: number;
  };
  errors: PreviewError[];
};

type PreviewSummary = PreviewImportResult["summary"];

export async function previewImport({
  pool,
  logger,
  adminUserId,
  originalFilename,
  rawPayload,
}: PreviewImportInput): Promise<PreviewImportResult> {
  const importSessionRepository = new ImportSessionRepository(pool);

  let parsedJson: unknown;

  try {
    parsedJson = JSON.parse(rawPayload);
  } catch {
    return storePreviewResult({
      importSessionRepository,
      logger,
      adminUserId,
      originalFilename,
      rawPayload,
      schemaVersion: null,
      status: "preview_invalid",
      summary: {
        questionCount: 0,
        insertCount: 0,
        updateCount: 0,
        invalidRecordCount: 1,
        sensitiveUpdateCount: 0,
      },
      errors: [
        {
          path: "payload",
          message: "Uploaded file must contain valid JSON.",
          code: "invalid_json",
          recordType: "payload",
          recordIdentifier: null,
        },
      ],
    });
  }

  const parsedPayload = canonicalImportPayloadSchema.safeParse(parsedJson);

  if (!parsedPayload.success) {
    const payloadErrors = formatPreviewErrors(parsedPayload.error, parsedJson);

    return storePreviewResult({
      importSessionRepository,
      logger,
      adminUserId,
      originalFilename,
      rawPayload,
      schemaVersion: readSchemaVersion(parsedJson),
      status: "preview_invalid",
      summary: {
        questionCount: countQuestions(parsedJson),
        insertCount: 0,
        updateCount: 0,
        invalidRecordCount: payloadErrors.length,
        sensitiveUpdateCount: 0,
      },
      errors: payloadErrors,
    });
  }

  const previewSummary = await buildPreviewSummary(pool, parsedPayload.data);

  return storePreviewResult({
    importSessionRepository,
    logger,
    adminUserId,
    originalFilename,
    rawPayload,
    schemaVersion: parsedPayload.data.schema_version,
    status: "preview_ready",
    summary: previewSummary,
    errors: [],
  });
}

async function buildPreviewSummary(pool: Pool, payload: CanonicalImportPayload): Promise<PreviewSummary> {
  const questionRepository = new QuestionPreviewRepository(pool);
  const existingQuestions = await questionRepository.findByExternalIds(
    payload.questions.map((question) => question.external_id),
  );
  const existingQuestionMap = new Map(
    existingQuestions.map((question) => [question.externalId, question]),
  );

  let insertCount = 0;
  let updateCount = 0;
  let sensitiveUpdateCount = 0;

  for (const question of payload.questions) {
    const existingQuestion = existingQuestionMap.get(question.external_id);

    if (!existingQuestion) {
      insertCount += 1;
      continue;
    }

    updateCount += 1;

    if (existingQuestion.status === "published") {
      sensitiveUpdateCount += 1;
    }
  }

  return {
    questionCount: payload.questions.length,
    insertCount,
    updateCount,
    invalidRecordCount: 0,
    sensitiveUpdateCount,
  };
}

async function storePreviewResult({
  importSessionRepository,
  logger,
  adminUserId,
  originalFilename,
  rawPayload,
  schemaVersion,
  status,
  summary,
  errors,
}: {
  importSessionRepository: ImportSessionRepository;
  logger: Logger;
  adminUserId: number;
  originalFilename: string;
  rawPayload: string;
  schemaVersion: string | null;
  status: "preview_ready" | "preview_invalid";
  summary: PreviewSummary;
  errors: PreviewError[];
}) {
  const importSessionId = await importSessionRepository.createPreview({
    uploadedByAdminUserId: adminUserId,
    originalFilename,
    status,
    schemaVersion,
    rawPayload,
    questionCount: summary.questionCount,
    insertCount: summary.insertCount,
    updateCount: summary.updateCount,
    invalidRecordCount: summary.invalidRecordCount,
    sensitiveUpdateCount: summary.sensitiveUpdateCount,
    previewResultJson: JSON.stringify({
      summary,
      errors,
      requiresReconfirmation: summary.sensitiveUpdateCount > 0,
    }),
  });

  logger.info("imports.preview.created", {
    importSessionId,
    adminUserId,
    status,
    originalFilename,
    insertCount: summary.insertCount,
    updateCount: summary.updateCount,
    invalidRecordCount: summary.invalidRecordCount,
    sensitiveUpdateCount: summary.sensitiveUpdateCount,
  });

  return {
    importSessionId,
    status,
    summary,
    errors,
  } satisfies PreviewImportResult;
}

function formatPreviewErrors(error: ZodError, parsedJson: unknown) {
  return error.issues.map<PreviewError>((issue) => {
    const normalizedPath = issue.path.filter(
      (entry): entry is string | number => typeof entry === "string" || typeof entry === "number",
    );
    const path = normalizedPath.map(String).join(".");
    const recordType = classifyRecordType(normalizedPath);
    const recordIdentifier = findRecordIdentifier(parsedJson, normalizedPath);

    return {
      path: path.length > 0 ? path : "payload",
      message: issue.message,
      code: issue.code,
      recordType,
      recordIdentifier,
    };
  });
}

function classifyRecordType(path: Array<string | number>): PreviewError["recordType"] {
  const head = path[0];

  if (head === "subjects") {
    return "subject";
  }

  if (head === "topics") {
    return "topic";
  }

  if (head === "questions") {
    return "question";
  }

  return "payload";
}

function findRecordIdentifier(parsedJson: unknown, path: Array<string | number>) {
  if (!parsedJson || typeof parsedJson !== "object") {
    return null;
  }

  const head = path[0];
  const index = path[1];

  if (typeof index !== "number") {
    return null;
  }

  if (head === "questions") {
    const questions = (parsedJson as Record<string, unknown>).questions;

    if (!Array.isArray(questions)) {
      return null;
    }

    const record = questions[index];

    if (!record || typeof record !== "object") {
      return null;
    }

    const externalId = (record as Record<string, unknown>).external_id;
    return typeof externalId === "string" ? externalId : null;
  }

  if (head === "topics") {
    const topics = (parsedJson as Record<string, unknown>).topics;

    if (!Array.isArray(topics)) {
      return null;
    }

    const record = topics[index];

    if (!record || typeof record !== "object") {
      return null;
    }

    const slug = (record as Record<string, unknown>).slug;
    return typeof slug === "string" ? slug : null;
  }

  if (head === "subjects") {
    const subjects = (parsedJson as Record<string, unknown>).subjects;

    if (!Array.isArray(subjects)) {
      return null;
    }

    const record = subjects[index];

    if (!record || typeof record !== "object") {
      return null;
    }

    const slug = (record as Record<string, unknown>).slug;
    return typeof slug === "string" ? slug : null;
  }

  return null;
}

function readSchemaVersion(parsedJson: unknown) {
  if (!parsedJson || typeof parsedJson !== "object") {
    return null;
  }

  const schemaVersion = (parsedJson as Record<string, unknown>).schema_version;
  return typeof schemaVersion === "string" ? schemaVersion : null;
}

function countQuestions(parsedJson: unknown) {
  if (!parsedJson || typeof parsedJson !== "object") {
    return 0;
  }

  const questions = (parsedJson as Record<string, unknown>).questions;
  return Array.isArray(questions) ? questions.length : 0;
}
