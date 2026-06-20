import { describe, expect, it } from "vitest";

import { createApp } from "../../app/create-app";
import { getTestPool } from "../../lib/testing/test-database";
import { testLogger } from "../../lib/testing/test-logger";
import { bootstrapAdmin } from "../../modules/auth/services/bootstrap-admin";
import { startOrResumeAttempt } from "../../modules/attempts/services/start-or-resume-attempt";
import {
  createQuestion,
  publishQuestion,
} from "../../modules/questions/services/question-authoring";
import {
  createPackage,
  publishPackage,
  setPackageComposition,
} from "../../modules/packages/services/package-authoring";
import { createSubject } from "../../modules/subjects/services/subject-authoring";
import { createTopic } from "../../modules/topics/services/topic-authoring";

async function seedAttemptRoutePackage() {
  const pool = await getTestPool();

  await bootstrapAdmin({
    pool,
    logger: testLogger,
    username: "admin",
    password: "password123",
  });
  await createSubject({
    pool,
    logger: testLogger,
    slug: "tps",
    label: "TPS",
    displayOrder: 1,
  });
  await createTopic({
    pool,
    logger: testLogger,
    slug: "penalaran-umum",
    subjectSlug: "tps",
    label: "Penalaran Umum",
    displayOrder: 1,
  });
  const question = await createQuestion({
    pool,
    logger: testLogger,
    input: {
      topicSlug: "penalaran-umum",
      type: "single_choice",
      difficulty: "medium",
      questionText: "Soal practice",
      explanationText: "Pembahasan practice",
      options: [
        { option_key: "A", option_text: "A", is_correct: true },
        { option_key: "B", option_text: "B", is_correct: false },
      ],
    },
  });
  await publishQuestion({
    pool,
    logger: testLogger,
    externalId: question!.externalId,
  });
  await createPackage({
    pool,
    logger: testLogger,
    slug: "paket-practice",
    name: "Paket Practice",
  });
  await setPackageComposition({
    pool,
    logger: testLogger,
    slug: "paket-practice",
    questionExternalIds: [question!.externalId],
  });
  await publishPackage({
    pool,
    logger: testLogger,
    slug: "paket-practice",
  });

  return { pool };
}

describe("attempt routes", () => {
  it("starts a practice attempt from a valid package and returns question-per-page payload", async () => {
    const { pool } = await seedAttemptRoutePackage();
    const app = createApp({ logger: testLogger, pool });

    const loginResponse = await app.request("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username: "admin", password: "password123" }),
    });
    const sessionCookie = loginResponse.headers.get("set-cookie") ?? "";

    const response = await app.request("/api/attempts/start-or-resume", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Cookie: sessionCookie,
      },
      body: JSON.stringify({
        packageSlug: "paket-practice",
      }),
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.mode).toBe("started");
    expect(payload.data.attempt.packageSlug).toBe("paket-practice");
    expect(payload.data.snapshots).toHaveLength(1);
    expect(payload.data.snapshots[0].explanationText).toBeUndefined();
    expect(payload.data.snapshots[0].options[0].is_correct).toBeUndefined();
  });

  it("returns resumed mode if the package already has an active attempt", async () => {
    const { pool } = await seedAttemptRoutePackage();
    await startOrResumeAttempt({
      pool,
      logger: testLogger,
      packageSlug: "paket-practice",
    });

    const app = createApp({ logger: testLogger, pool });
    const loginResponse = await app.request("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username: "admin", password: "password123" }),
    });
    const sessionCookie = loginResponse.headers.get("set-cookie") ?? "";

    const response = await app.request("/api/attempts/start-or-resume", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Cookie: sessionCookie,
      },
      body: JSON.stringify({
        packageSlug: "paket-practice",
      }),
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.mode).toBe("resumed");
  });
});
