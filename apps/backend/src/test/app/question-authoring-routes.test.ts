import { describe, expect, it } from "vitest";

import { createApp } from "../../app/create-app";
import { getTestPool } from "../../lib/testing/test-database";
import { testLogger } from "../../lib/testing/test-logger";
import { bootstrapAdmin } from "../../modules/auth/services/bootstrap-admin";
import { createSubject } from "../../modules/subjects/services/subject-authoring";
import { createTopic } from "../../modules/topics/services/topic-authoring";

describe("question authoring routes", () => {
  it("creates and lists questions through authenticated routes", async () => {
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

    const app = createApp({ logger: testLogger, pool });
    const loginResponse = await app.request("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username: "admin", password: "password123" }),
    });
    const sessionCookie = loginResponse.headers.get("set-cookie") ?? "";

    const createResponse = await app.request("/api/questions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Cookie: sessionCookie,
      },
      body: JSON.stringify({
        topicSlug: "aljabar",
        type: "single_choice",
        difficulty: "medium",
        questionText: "Route soal",
        explanationText: "",
        options: [
          { option_key: "A", option_text: "A", is_correct: true },
          { option_key: "B", option_text: "B", is_correct: false },
        ],
      }),
    });
    const createdPayload = await createResponse.json();

    expect(createResponse.status).toBe(200);
    expect(createdPayload.data.externalId).toContain("manual_");

    const listResponse = await app.request("/api/questions?page=1&pageSize=10&archived=false", {
      headers: {
        Cookie: sessionCookie,
      },
    });
    const listPayload = await listResponse.json();

    expect(listResponse.status).toBe(200);
    expect(listPayload.data.items).toHaveLength(1);
    expect(listPayload.data.total).toBe(1);
  });
});
