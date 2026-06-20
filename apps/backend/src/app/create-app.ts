import { Hono } from "hono";
import { deleteCookie, setCookie } from "hono/cookie";
import { requestId } from "hono/request-id";
import type { Pool } from "mysql2/promise";
import { z } from "zod";

import type { Logger } from "../lib/logger";
import { requireSession } from "../middleware/require-session";
import { AuthRepository } from "../modules/auth/repositories/auth-repository";
import type { SessionRecord } from "../modules/auth/repositories/session-repository";
import { changeAdminPassword } from "../modules/auth/services/change-admin-password";
import { loginAdmin } from "../modules/auth/services/login-admin";
import { logoutAdmin } from "../modules/auth/services/logout-admin";
import { previewImport } from "../modules/imports/services/preview-import";
import { startOrResumeAttempt } from "../modules/attempts/services/start-or-resume-attempt";
import { autosaveAttemptAnswer } from "../modules/attempts/services/autosave-attempt-answer";
import { getAttemptDetail } from "../modules/attempts/services/get-attempt-detail";
import { getAttemptResult } from "../modules/attempts/services/get-attempt-result";
import { submitAttempt } from "../modules/attempts/services/submit-attempt";
import {
  archiveQuestion,
  bulkQuestionAction,
  createQuestion,
  duplicateQuestion,
  listQuestions,
  publishQuestion,
  updateQuestion,
} from "../modules/questions/services/question-authoring";
import {
  archivePackage,
  createPackage,
  duplicatePackage,
  listAvailablePackagesForPractice,
  listPackages,
  publishPackage,
  setPackageComposition,
  updatePackageMetadata,
} from "../modules/packages/services/package-authoring";
import { archiveSubject, createSubject, listSubjects, updateSubject } from "../modules/subjects/services/subject-authoring";
import { archiveTopic, createTopic, listTopics, updateTopic } from "../modules/topics/services/topic-authoring";

type CreateAppOptions = {
  logger: Logger;
  pool?: Pool;
};

export function createApp({ logger, pool }: CreateAppOptions) {
  const app = new Hono<{
    Variables: {
      requestId: string;
      session: SessionRecord;
    };
  }>();
  const loginSchema = z.object({
    username: z.string().min(1),
    password: z.string().min(1),
  });
  const changePasswordSchema = z.object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8),
  });
  const subjectSchema = z.object({
    slug: z.string().trim().min(1),
    label: z.string().trim().min(1),
    displayOrder: z.coerce.number().int().positive(),
  });
  const topicSchema = z.object({
    slug: z.string().trim().min(1),
    subjectSlug: z.string().trim().min(1),
    label: z.string().trim().min(1),
    displayOrder: z.coerce.number().int().positive(),
  });
  const questionOptionSchema = z.object({
    option_key: z.string().trim().min(1),
    option_text: z.string().trim().min(1),
    is_correct: z.boolean(),
  });
  const questionSchema = z.object({
    topicSlug: z.string().trim().min(1),
    type: z.enum(["single_choice", "multiple_response"]),
    source: z.string().trim().min(1).optional(),
    difficulty: z.enum(["easy", "medium", "hard"]),
    status: z.enum(["draft", "published"]).optional(),
    questionText: z.string().trim().min(1),
    explanationText: z.string(),
    options: z.array(questionOptionSchema).min(2),
  });
  const bulkQuestionSchema = z.object({
    action: z.enum(["publish", "archive", "draft"]),
    externalIds: z.array(z.string().trim().min(1)).min(1),
  });
  const packageSchema = z.object({
    slug: z.string().trim().min(1),
    name: z.string().trim().min(1),
    description: z.string().trim().optional().nullable(),
  });
  const packageMetadataSchema = packageSchema.omit({ slug: true });
  const packageCompositionSchema = z.object({
    questionExternalIds: z.array(z.string().trim().min(1)),
  });
  const duplicatePackageSchema = z.object({
    newSlug: z.string().trim().min(1),
  });
  const startOrResumeAttemptSchema = z.object({
    packageSlug: z.string().trim().min(1),
  });
  const autosaveAttemptAnswerSchema = z.object({
    selectedOptionKeys: z.array(z.string().trim().min(1)),
  });
  const questionListQuerySchema = z.object({
    page: z.coerce.number().int().positive().default(1),
    pageSize: z.coerce.number().int().positive().max(100).default(20),
    status: z.enum(["draft", "published"]).optional(),
    subjectSlug: z.string().trim().min(1).optional(),
    topicSlug: z.string().trim().min(1).optional(),
    difficulty: z.enum(["easy", "medium", "hard"]).optional(),
    archived: z
      .enum(["true", "false"])
      .transform((value) => value === "true")
      .optional(),
    search: z.string().trim().min(1).optional(),
  });

  app.use("*", requestId());

  app.onError((error, c) =>
    c.json(
      {
        success: false,
        message: error.message || "Unexpected server error.",
        data: null,
      },
      classifyErrorStatus(error),
    ),
  );

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

  app.post("/api/auth/login", async (c) => {
    if (!pool) {
      return c.json(
        {
          success: false,
          message: "Application database is not configured.",
          data: null,
        },
        500,
      );
    }

    const payload = loginSchema.parse(await c.req.json());
    try {
      const result = await loginAdmin({
        pool,
        logger,
        username: payload.username,
        password: payload.password,
        ttlHours: 12,
      });

      setCookie(c, "session_token", result.sessionToken, {
        httpOnly: true,
        path: "/",
        sameSite: "Lax",
      });

      return c.json({
        success: true,
        message: "Login successful.",
        data: {
          adminUserId: result.adminUserId,
          adminUsername: result.adminUsername,
        },
      });
    } catch (error) {
      if (error instanceof Error && error.message === "Invalid credentials.") {
        return c.json(
          {
            success: false,
            message: "Invalid credentials.",
            data: null,
          },
          401,
        );
      }

      throw error;
    }
  });

  app.post("/api/auth/logout", requireSession({ pool }), async (c) => {
    const session = c.get("session") as SessionRecord;

    await logoutAdmin({
      pool: pool!,
      logger,
      sessionToken: session.session_token,
    });

    deleteCookie(c, "session_token", {
      path: "/",
    });

    return c.json({
      success: true,
      message: "Logout successful.",
      data: null,
    });
  });

  app.post("/api/auth/change-password", requireSession({ pool }), async (c) => {
    const session = c.get("session") as SessionRecord;
    const payload = changePasswordSchema.parse(await c.req.json());
    const authRepository = new AuthRepository(pool!);
    const adminUser = await authRepository.findAdminById(session.admin_user_id);

    if (!adminUser) {
      return c.json(
        {
          success: false,
          message: "Authentication required.",
          data: null,
        },
        401,
      );
    }

    await changeAdminPassword({
      pool: pool!,
      logger,
      username: adminUser.username,
      currentPassword: payload.currentPassword,
      newPassword: payload.newPassword,
    });

    return c.json({
      success: true,
      message: "Password changed.",
      data: null,
    });
  });

  app.get("/api/protected", requireSession({ pool }), (c) =>
    c.json({
      success: true,
      message: "Authenticated.",
      data: {
        ok: true,
      },
    }),
  );

  app.post("/api/imports/preview", requireSession({ pool }), async (c) => {
    const session = c.get("session") as SessionRecord;
    const body = await c.req.parseBody();
    const uploadedFile = body.file;

    if (!(uploadedFile instanceof File)) {
      return c.json(
        {
          success: false,
          message: "Import preview requires a JSON file upload.",
          data: null,
        },
        400,
      );
    }

    const rawPayload = await uploadedFile.text();
    const result = await previewImport({
      pool: pool!,
      logger,
      adminUserId: session.admin_user_id,
      originalFilename: uploadedFile.name,
      rawPayload,
    });

    return c.json({
      success: true,
      message: "Import preview created.",
      data: {
        importSessionId: result.importSessionId,
        status: result.status,
        summary: result.summary,
        errors: result.errors,
        requiresReconfirmation: result.summary.sensitiveUpdateCount > 0,
      },
    });
  });

  app.get("/api/subjects", requireSession({ pool }), async (c) =>
    c.json({
      success: true,
      data: await listSubjects(pool!),
    }),
  );

  app.post("/api/subjects", requireSession({ pool }), async (c) => {
    const payload = subjectSchema.parse(await c.req.json());
    const subject = await createSubject({
      pool: pool!,
      logger,
      slug: payload.slug,
      label: payload.label,
      displayOrder: payload.displayOrder,
    });

    return c.json({
      success: true,
      data: subject,
    });
  });

  app.patch("/api/subjects/:slug", requireSession({ pool }), async (c) => {
    const payload = subjectSchema.omit({ slug: true }).parse(await c.req.json());
    const subject = await updateSubject({
      pool: pool!,
      logger,
      slug: c.req.param("slug"),
      label: payload.label,
      displayOrder: payload.displayOrder,
    });

    return c.json({
      success: true,
      data: subject,
    });
  });

  app.post("/api/subjects/:slug/archive", requireSession({ pool }), async (c) => {
    const subject = await archiveSubject({
      pool: pool!,
      logger,
      slug: c.req.param("slug"),
    });

    return c.json({
      success: true,
      data: subject,
    });
  });

  app.get("/api/topics", requireSession({ pool }), async (c) =>
    c.json({
      success: true,
      data: await listTopics(pool!),
    }),
  );

  app.post("/api/topics", requireSession({ pool }), async (c) => {
    const payload = topicSchema.parse(await c.req.json());
    const topic = await createTopic({
      pool: pool!,
      logger,
      slug: payload.slug,
      subjectSlug: payload.subjectSlug,
      label: payload.label,
      displayOrder: payload.displayOrder,
    });

    return c.json({
      success: true,
      data: topic,
    });
  });

  app.patch("/api/topics/:slug", requireSession({ pool }), async (c) => {
    const payload = topicSchema.omit({ slug: true, subjectSlug: true }).parse(await c.req.json());
    const topic = await updateTopic({
      pool: pool!,
      logger,
      slug: c.req.param("slug"),
      label: payload.label,
      displayOrder: payload.displayOrder,
    });

    return c.json({
      success: true,
      data: topic,
    });
  });

  app.post("/api/topics/:slug/archive", requireSession({ pool }), async (c) => {
    const topic = await archiveTopic({
      pool: pool!,
      logger,
      slug: c.req.param("slug"),
    });

    return c.json({
      success: true,
      data: topic,
    });
  });

  app.get("/api/questions", requireSession({ pool }), async (c) => {
    const query = questionListQuerySchema.parse(c.req.query());
    const result = await listQuestions(pool!, query);

    return c.json({
      success: true,
      data: result,
    });
  });

  app.post("/api/questions", requireSession({ pool }), async (c) => {
    const payload = questionSchema.parse(await c.req.json());
    const question = await createQuestion({
      pool: pool!,
      logger,
      input: payload,
    });

    return c.json({
      success: true,
      data: question,
    });
  });

  app.patch("/api/questions/:externalId", requireSession({ pool }), async (c) => {
    const payload = questionSchema.parse(await c.req.json());
    const question = await updateQuestion({
      pool: pool!,
      logger,
      externalId: c.req.param("externalId"),
      input: payload,
    });

    return c.json({
      success: true,
      data: question,
    });
  });

  app.post("/api/questions/:externalId/archive", requireSession({ pool }), async (c) => {
    const question = await archiveQuestion({
      pool: pool!,
      logger,
      externalId: c.req.param("externalId"),
    });

    return c.json({
      success: true,
      data: question,
    });
  });

  app.post("/api/questions/:externalId/duplicate", requireSession({ pool }), async (c) => {
    const question = await duplicateQuestion({
      pool: pool!,
      logger,
      externalId: c.req.param("externalId"),
    });

    return c.json({
      success: true,
      data: question,
    });
  });

  app.post("/api/questions/:externalId/publish", requireSession({ pool }), async (c) => {
    const question = await publishQuestion({
      pool: pool!,
      logger,
      externalId: c.req.param("externalId"),
    });

    return c.json({
      success: true,
      data: question,
    });
  });

  app.post("/api/questions/bulk", requireSession({ pool }), async (c) => {
    const payload = bulkQuestionSchema.parse(await c.req.json());
    const result = await bulkQuestionAction({
      pool: pool!,
      logger,
      action: payload.action,
      externalIds: payload.externalIds,
    });

    return c.json({
      success: true,
      data: result,
    });
  });

  app.get("/api/packages", requireSession({ pool }), async (c) =>
    c.json({
      success: true,
      data: await listPackages(pool!),
    }),
  );

  app.get("/api/packages/available-for-practice", requireSession({ pool }), async (c) =>
    c.json({
      success: true,
      data: await listAvailablePackagesForPractice(pool!),
    }),
  );

  app.post("/api/packages", requireSession({ pool }), async (c) => {
    const payload = packageSchema.parse(await c.req.json());
    const record = await createPackage({
      pool: pool!,
      logger,
      slug: payload.slug,
      name: payload.name,
      description: payload.description,
    });

    return c.json({
      success: true,
      data: record,
    });
  });

  app.patch("/api/packages/:slug", requireSession({ pool }), async (c) => {
    const payload = packageMetadataSchema.parse(await c.req.json());
    const record = await updatePackageMetadata({
      pool: pool!,
      logger,
      slug: c.req.param("slug"),
      name: payload.name,
      description: payload.description,
    });

    return c.json({
      success: true,
      data: record,
    });
  });

  app.put("/api/packages/:slug/composition", requireSession({ pool }), async (c) => {
    const payload = packageCompositionSchema.parse(await c.req.json());
    const record = await setPackageComposition({
      pool: pool!,
      logger,
      slug: c.req.param("slug"),
      questionExternalIds: payload.questionExternalIds,
    });

    return c.json({
      success: true,
      data: record,
    });
  });

  app.post("/api/packages/:slug/publish", requireSession({ pool }), async (c) => {
    const record = await publishPackage({
      pool: pool!,
      logger,
      slug: c.req.param("slug"),
    });

    return c.json({
      success: true,
      data: record,
    });
  });

  app.post("/api/packages/:slug/archive", requireSession({ pool }), async (c) => {
    const record = await archivePackage({
      pool: pool!,
      logger,
      slug: c.req.param("slug"),
    });

    return c.json({
      success: true,
      data: record,
    });
  });

  app.post("/api/packages/:slug/duplicate", requireSession({ pool }), async (c) => {
    const payload = duplicatePackageSchema.parse(await c.req.json());
    const record = await duplicatePackage({
      pool: pool!,
      logger,
      slug: c.req.param("slug"),
      newSlug: payload.newSlug,
    });

    return c.json({
      success: true,
      data: record,
    });
  });

  app.post("/api/attempts/start-or-resume", requireSession({ pool }), async (c) => {
    const payload = startOrResumeAttemptSchema.parse(await c.req.json());
    const result = await startOrResumeAttempt({
      pool: pool!,
      logger,
      packageSlug: payload.packageSlug,
    });

    return c.json({
      success: true,
      data: result,
    });
  });

  app.get("/api/attempts/:attemptId", requireSession({ pool }), async (c) => {
    const attemptId = Number(c.req.param("attemptId"));
    const result = await getAttemptDetail({
      pool: pool!,
      attemptId,
    });

    return c.json({
      success: true,
      data: result,
    });
  });

  app.put(
    "/api/attempts/:attemptId/snapshots/:snapshotId/answer",
    requireSession({ pool }),
    async (c) => {
      const attemptId = Number(c.req.param("attemptId"));
      const snapshotId = Number(c.req.param("snapshotId"));
      const payload = autosaveAttemptAnswerSchema.parse(await c.req.json());
      const result = await autosaveAttemptAnswer({
        pool: pool!,
        logger,
        attemptId,
        snapshotId,
        selectedOptionKeys: payload.selectedOptionKeys,
      });

      return c.json({
        success: true,
        data: result,
      });
    },
  );

  app.post("/api/attempts/:attemptId/submit", requireSession({ pool }), async (c) => {
    const attemptId = Number(c.req.param("attemptId"));
    const result = await submitAttempt({
      pool: pool!,
      logger,
      attemptId,
    });

    return c.json({
      success: true,
      data: result,
    });
  });

  app.get("/api/attempts/:attemptId/result", requireSession({ pool }), async (c) => {
    const attemptId = Number(c.req.param("attemptId"));
    const result = await getAttemptResult({
      pool: pool!,
      attemptId,
    });

    return c.json({
      success: true,
      data: result,
    });
  });

  return app;
}

function classifyErrorStatus(error: Error) {
  const message = error.message.toLowerCase();

  if (message.includes("not found")) {
    return 404;
  }

  if (
    message.includes("required") ||
    message.includes("must") ||
    message.includes("cannot be archived") ||
    message.includes("invalid credentials") ||
    message.includes("authentication required") ||
    message.includes("already exists") ||
    message.includes("has not been submitted yet")
  ) {
    return 400;
  }

  return 500;
}
