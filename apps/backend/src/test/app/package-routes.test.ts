import { describe, expect, it } from "vitest";

import { createApp } from "../../app/create-app";
import { getTestPool } from "../../lib/testing/test-database";
import { testLogger } from "../../lib/testing/test-logger";
import { bootstrapAdmin } from "../../modules/auth/services/bootstrap-admin";
import {
  createQuestion,
  publishQuestion,
} from "../../modules/questions/services/question-authoring";
import { createSubject } from "../../modules/subjects/services/subject-authoring";
import { createTopic } from "../../modules/topics/services/topic-authoring";

describe("package routes", () => {
  it("creates, composes, publishes, and exposes available packages for practice", async () => {
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
      slug: "matematika",
      label: "Matematika",
      displayOrder: 1,
    });
    await createTopic({
      pool,
      logger: testLogger,
      slug: "aljabar",
      subjectSlug: "matematika",
      label: "Aljabar",
      displayOrder: 1,
    });

    const question = await createQuestion({
      pool,
      logger: testLogger,
      input: {
        topicSlug: "aljabar",
        type: "single_choice",
        difficulty: "medium",
        questionText: "Soal paket",
        explanationText: "Pembahasan paket",
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

    const app = createApp({ logger: testLogger, pool });
    const loginResponse = await app.request("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username: "admin", password: "password123" }),
    });
    const sessionCookie = loginResponse.headers.get("set-cookie") ?? "";

    const createResponse = await app.request("/api/packages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Cookie: sessionCookie,
      },
      body: JSON.stringify({
        slug: "paket-aljabar",
        name: "Paket Aljabar",
        description: "Paket route test",
      }),
    });

    expect(createResponse.status).toBe(200);

    const compositionResponse = await app.request("/api/packages/paket-aljabar/composition", {
      method: "PUT",
      headers: {
        "content-type": "application/json",
        Cookie: sessionCookie,
      },
      body: JSON.stringify({
        questionExternalIds: [question!.externalId],
      }),
    });

    expect(compositionResponse.status).toBe(200);

    const publishResponse = await app.request("/api/packages/paket-aljabar/publish", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Cookie: sessionCookie,
      },
      body: JSON.stringify({}),
    });

    expect(publishResponse.status).toBe(200);

    const availableResponse = await app.request("/api/packages/available-for-practice", {
      headers: {
        Cookie: sessionCookie,
      },
    });
    const payload = await availableResponse.json();

    expect(availableResponse.status).toBe(200);
    expect(payload.data).toHaveLength(1);
    expect(payload.data[0].slug).toBe("paket-aljabar");
    expect(payload.data[0].availableForPractice).toBe(true);
  });
});
