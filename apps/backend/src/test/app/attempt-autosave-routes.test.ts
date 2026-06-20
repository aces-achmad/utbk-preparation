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

async function seedRouteAttempt() {
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
      questionText: "Soal route autosave",
      explanationText: "Pembahasan route autosave",
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
    slug: "paket-route-autosave",
    name: "Paket Route Autosave",
  });
  await setPackageComposition({
    pool,
    logger: testLogger,
    slug: "paket-route-autosave",
    questionExternalIds: [question!.externalId],
  });
  await publishPackage({
    pool,
    logger: testLogger,
    slug: "paket-route-autosave",
  });

  const started = await startOrResumeAttempt({
    pool,
    logger: testLogger,
    packageSlug: "paket-route-autosave",
  });

  return { pool, started };
}

describe("attempt autosave routes", () => {
  it("loads attempt detail and persists autosave state", async () => {
    const { pool, started } = await seedRouteAttempt();
    const app = createApp({ logger: testLogger, pool });

    const loginResponse = await app.request("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username: "admin", password: "password123" }),
    });
    const sessionCookie = loginResponse.headers.get("set-cookie") ?? "";

    const detailResponse = await app.request(`/api/attempts/${started.attempt.id}`, {
      headers: {
        Cookie: sessionCookie,
      },
    });
    const detailPayload = await detailResponse.json();

    expect(detailResponse.status).toBe(200);
    expect(detailPayload.data.attempt.id).toBe(started.attempt.id);
    expect(detailPayload.data.snapshots[0].explanationText).toBeUndefined();
    expect(detailPayload.data.snapshots[0].options[0].is_correct).toBeUndefined();

    const autosaveResponse = await app.request(
      `/api/attempts/${started.attempt.id}/snapshots/${started.snapshots[0]!.snapshotId}/answer`,
      {
        method: "PUT",
        headers: {
          "content-type": "application/json",
          Cookie: sessionCookie,
        },
        body: JSON.stringify({
          selectedOptionKeys: ["A"],
        }),
      },
    );
    const autosavePayload = await autosaveResponse.json();

    expect(autosaveResponse.status).toBe(200);
    expect(autosavePayload.data.syncState).toBe("saved");
  });
});
