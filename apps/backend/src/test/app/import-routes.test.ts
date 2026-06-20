import { describe, expect, it } from "vitest";

import { createApp } from "../../app/create-app";
import { getTestPool } from "../../lib/testing/test-database";
import { testLogger } from "../../lib/testing/test-logger";
import { bootstrapAdmin } from "../../modules/auth/services/bootstrap-admin";

describe("import routes", () => {
  it("requires authentication for preview uploads", async () => {
    const app = createApp({ logger: testLogger });
    const formData = new FormData();
    formData.append(
      "file",
      new File(
        [
          JSON.stringify({
            schema_version: "1.0",
            subjects: [],
            topics: [],
            questions: [],
          }),
        ],
        "import.json",
        { type: "application/json" },
      ),
    );

    const response = await app.request("/api/imports/preview", {
      method: "POST",
      body: formData,
    });

    expect(response.status).toBe(401);
  });

  it("creates an import preview session from an uploaded JSON file", async () => {
    const pool = await getTestPool();

    await bootstrapAdmin({
      pool,
      logger: testLogger,
      username: "admin",
      password: "password123",
    });

    const app = createApp({ logger: testLogger, pool });
    const loginResponse = await app.request("/api/auth/login", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        username: "admin",
        password: "password123",
      }),
    });
    const sessionCookie = loginResponse.headers.get("set-cookie") ?? "";

    const formData = new FormData();
    formData.append(
      "file",
      new File(
        [
          JSON.stringify({
            schema_version: "1.0",
            subjects: [{ slug: "tps", label: "TPS", display_order: 1 }],
            topics: [
              {
                slug: "penalaran-umum",
                subject_slug: "tps",
                label: "Penalaran Umum",
                display_order: 1,
              },
            ],
            questions: [
              {
                external_id: "ext-preview-001",
                topic_slug: "penalaran-umum",
                type: "single_choice",
                source: "modul-a:batch-01",
                difficulty: "medium",
                status: "draft",
                question_text: "Contoh soal",
                explanation_text: "Contoh pembahasan",
                options: [
                  { option_key: "A", option_text: "A", is_correct: true },
                  { option_key: "B", option_text: "B", is_correct: false },
                ],
              },
            ],
          }),
        ],
        "import.json",
        { type: "application/json" },
      ),
    );

    const response = await app.request("/api/imports/preview", {
      method: "POST",
      headers: {
        Cookie: sessionCookie,
      },
      body: formData,
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.data.importSessionId).toBeTypeOf("number");
    expect(payload.data.summary.insertCount).toBe(1);
    expect(payload.data.summary.updateCount).toBe(0);
    expect(payload.data.summary.invalidRecordCount).toBe(0);
    expect(payload.data.summary.sensitiveUpdateCount).toBe(0);
  });
});
