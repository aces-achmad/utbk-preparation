import { describe, expect, it } from "vitest";

import { createApp } from "../../app/create-app";
import { getTestPool } from "../../lib/testing/test-database";
import { testLogger } from "../../lib/testing/test-logger";
import { autosaveAttemptAnswer } from "../../modules/attempts/services/autosave-attempt-answer";
import { startOrResumeAttempt } from "../../modules/attempts/services/start-or-resume-attempt";
import { bootstrapAdmin } from "../../modules/auth/services/bootstrap-admin";
import { createQuestion, publishQuestion } from "../../modules/questions/services/question-authoring";
import { createPackage, publishPackage, setPackageComposition } from "../../modules/packages/services/package-authoring";
import { createSubject } from "../../modules/subjects/services/subject-authoring";
import { createTopic } from "../../modules/topics/services/topic-authoring";

async function seedAttemptSubmitPackage() {
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

  const first = await createQuestion({
    pool,
    logger: testLogger,
    input: {
      topicSlug: "penalaran-umum",
      type: "single_choice",
      difficulty: "easy",
      questionText: "Soal route benar",
      explanationText: "Pembahasan route benar",
      options: [
        { option_key: "A", option_text: "A", is_correct: true },
        { option_key: "B", option_text: "B", is_correct: false },
      ],
    },
  });
  const second = await createQuestion({
    pool,
    logger: testLogger,
    input: {
      topicSlug: "penalaran-umum",
      type: "multiple_response",
      difficulty: "medium",
      questionText: "Soal route salah",
      explanationText: "Pembahasan route salah",
      options: [
        { option_key: "A", option_text: "A2", is_correct: true },
        { option_key: "B", option_text: "B2", is_correct: true },
        { option_key: "C", option_text: "C2", is_correct: false },
      ],
    },
  });

  await publishQuestion({ pool, logger: testLogger, externalId: first!.externalId });
  await publishQuestion({ pool, logger: testLogger, externalId: second!.externalId });

  await createPackage({
    pool,
    logger: testLogger,
    slug: "paket-route-submit",
    name: "Paket Route Submit",
  });
  await setPackageComposition({
    pool,
    logger: testLogger,
    slug: "paket-route-submit",
    questionExternalIds: [first!.externalId, second!.externalId],
  });
  await publishPackage({
    pool,
    logger: testLogger,
    slug: "paket-route-submit",
  });

  return { pool };
}

describe("attempt submit routes", () => {
  it("submits an attempt and exposes stable result review", async () => {
    const { pool } = await seedAttemptSubmitPackage();
    const started = await startOrResumeAttempt({
      pool,
      logger: testLogger,
      packageSlug: "paket-route-submit",
      shuffleQuestions: (items) => items,
      shuffleOptions: (items) => items,
    });

    await autosaveAttemptAnswer({
      pool,
      logger: testLogger,
      attemptId: started.attempt.id,
      snapshotId: started.snapshots[0]!.snapshotId,
      selectedOptionKeys: ["A"],
    });
    await autosaveAttemptAnswer({
      pool,
      logger: testLogger,
      attemptId: started.attempt.id,
      snapshotId: started.snapshots[1]!.snapshotId,
      selectedOptionKeys: ["A"],
    });

    const app = createApp({ logger: testLogger, pool });
    const loginResponse = await app.request("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username: "admin", password: "password123" }),
    });
    const sessionCookie = loginResponse.headers.get("set-cookie") ?? "";

    const submitResponse = await app.request(`/api/attempts/${started.attempt.id}/submit`, {
      method: "POST",
      headers: {
        Cookie: sessionCookie,
      },
    });
    const submitPayload = await submitResponse.json();

    expect(submitResponse.status).toBe(200);
    expect(submitPayload.data.summary).toEqual({
      totalQuestions: 2,
      correctCount: 1,
      incorrectCount: 1,
      unansweredCount: 0,
      scorePercentage: 50,
    });

    const resultResponse = await app.request(`/api/attempts/${started.attempt.id}/result`, {
      headers: {
        Cookie: sessionCookie,
      },
    });
    const resultPayload = await resultResponse.json();

    expect(resultResponse.status).toBe(200);
    expect(resultPayload.data.review).toHaveLength(2);

    const repeatedSubmit = await app.request(`/api/attempts/${started.attempt.id}/submit`, {
      method: "POST",
      headers: {
        Cookie: sessionCookie,
      },
    });
    const repeatedPayload = await repeatedSubmit.json();

    expect(repeatedPayload.data.summary).toEqual(submitPayload.data.summary);
  });

  it("rejects result review while the attempt is still active", async () => {
    const { pool } = await seedAttemptSubmitPackage();
    const started = await startOrResumeAttempt({
      pool,
      logger: testLogger,
      packageSlug: "paket-route-submit",
      shuffleQuestions: (items) => items,
      shuffleOptions: (items) => items,
    });

    const app = createApp({ logger: testLogger, pool });
    const loginResponse = await app.request("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username: "admin", password: "password123" }),
    });
    const sessionCookie = loginResponse.headers.get("set-cookie") ?? "";

    const response = await app.request(`/api/attempts/${started.attempt.id}/result`, {
      headers: {
        Cookie: sessionCookie,
      },
    });
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.message).toBe("Attempt has not been submitted yet.");
  });
});
