import type { RowDataPacket } from "mysql2/promise";
import { describe, expect, it } from "vitest";

import { getTestPool } from "../../lib/testing/test-database";
import { testLogger } from "../../lib/testing/test-logger";
import { bootstrapAdmin } from "../../modules/auth/services/bootstrap-admin";
import {
  previewImport,
  type PreviewImportResult,
} from "../../modules/imports/services/preview-import";

type ImportSessionRow = RowDataPacket & {
  status: "preview_ready" | "preview_invalid";
  raw_payload: string;
  insert_count: number;
  update_count: number;
  sensitive_update_count: number;
};

describe("previewImport", () => {
  it("stores a preview session and classifies insert/update plus sensitive published updates", async () => {
    const pool = await getTestPool();

    await bootstrapAdmin({
      pool,
      logger: testLogger,
      username: "admin",
      password: "password123",
    });

    await pool.query(
      `INSERT INTO questions (
        external_id,
        topic_slug,
        type,
        source,
        difficulty,
        status,
        question_text,
        explanation_text,
        options_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        "ext-existing-published",
        "aljabar",
        "single_choice",
        "legacy:set-01",
        "medium",
        "published",
        "Legacy published question",
        "Legacy explanation",
        JSON.stringify([
          { option_key: "A", option_text: "1", is_correct: true },
          { option_key: "B", option_text: "2", is_correct: false },
        ]),
      ],
    );

    await pool.query(
      `INSERT INTO questions (
        external_id,
        topic_slug,
        type,
        source,
        difficulty,
        status,
        question_text,
        explanation_text,
        options_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        "ext-existing-draft",
        "aljabar",
        "single_choice",
        "legacy:set-02",
        "easy",
        "draft",
        "Legacy draft question",
        "Legacy explanation",
        JSON.stringify([
          { option_key: "A", option_text: "1", is_correct: false },
          { option_key: "B", option_text: "2", is_correct: true },
        ]),
      ],
    );

    const rawPayload = JSON.stringify({
      schema_version: "1.0",
      subjects: [{ slug: "matematika", label: "Matematika", display_order: 1 }],
      topics: [{ slug: "aljabar", subject_slug: "matematika", label: "Aljabar", display_order: 1 }],
      questions: [
        {
          external_id: "ext-existing-published",
          topic_slug: "aljabar",
          type: "single_choice",
          source: "modul-a:batch-01",
          difficulty: "medium",
          status: "published",
          question_text: "Updated published question",
          explanation_text: "Updated explanation",
          options: [
            { option_key: "A", option_text: "Pilihan A", is_correct: true },
            { option_key: "B", option_text: "Pilihan B", is_correct: false },
          ],
        },
        {
          external_id: "ext-existing-draft",
          topic_slug: "aljabar",
          type: "single_choice",
          source: "modul-a:batch-01",
          difficulty: "easy",
          status: "draft",
          question_text: "Updated draft question",
          explanation_text: "Updated explanation",
          options: [
            { option_key: "A", option_text: "Pilihan A", is_correct: false },
            { option_key: "B", option_text: "Pilihan B", is_correct: true },
          ],
        },
        {
          external_id: "ext-new-question",
          topic_slug: "aljabar",
          type: "multiple_response",
          source: "modul-a:batch-01",
          difficulty: "hard",
          status: "draft",
          question_text: "Brand new question",
          explanation_text: "New explanation",
          options: [
            { option_key: "A", option_text: "Pilihan A", is_correct: true },
            { option_key: "B", option_text: "Pilihan B", is_correct: true },
            { option_key: "C", option_text: "Pilihan C", is_correct: false },
          ],
        },
      ],
    });

    const result = await previewImport({
      pool,
      logger: testLogger,
      adminUserId: 1,
      originalFilename: "valid-import.json",
      rawPayload,
    });

    expect(result.status).toBe("preview_ready");
    expect(result.summary.questionCount).toBe(3);
    expect(result.summary.insertCount).toBe(1);
    expect(result.summary.updateCount).toBe(2);
    expect(result.summary.invalidRecordCount).toBe(0);
    expect(result.summary.sensitiveUpdateCount).toBe(1);

    const [rows] = await pool.query<ImportSessionRow[]>(
      `SELECT status, raw_payload, insert_count, update_count, sensitive_update_count
       FROM import_sessions
       ORDER BY id ASC`,
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]?.status).toBe("preview_ready");
    expect(rows[0]?.raw_payload).toBe(rawPayload);
    expect(rows[0]?.insert_count).toBe(1);
    expect(rows[0]?.update_count).toBe(2);
    expect(rows[0]?.sensitive_update_count).toBe(1);
  });

  it("stores invalid previews with detailed field-level errors", async () => {
    const pool = await getTestPool();

    await bootstrapAdmin({
      pool,
      logger: testLogger,
      username: "admin",
      password: "password123",
    });

    const rawPayload = JSON.stringify({
      schema_version: "1.0",
      subjects: [{ slug: "matematika", label: "Matematika", display_order: 1 }],
      topics: [{ slug: "aljabar", subject_slug: "matematika", label: "Aljabar", display_order: 1 }],
      questions: [
        {
          external_id: "ext-invalid",
          topic_slug: "aljabar",
          type: "multiple_response",
          source: "modul-a:batch-01",
          difficulty: "medium",
          status: "published",
          question_text: "Broken question",
          explanation_text: "",
          options: [
            { option_key: "A", option_text: "Pilihan A", is_correct: true },
            { option_key: "A", option_text: "Pilihan A kedua", is_correct: false },
          ],
        },
      ],
    });

    const result = await previewImport({
      pool,
      logger: testLogger,
      adminUserId: 1,
      originalFilename: "invalid-import.json",
      rawPayload,
    });

    expect(result.status).toBe("preview_invalid");
    expect(result.summary.insertCount).toBe(0);
    expect(result.summary.updateCount).toBe(0);
    expect(result.summary.invalidRecordCount).toBeGreaterThan(0);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "questions.0.explanation_text",
          recordIdentifier: "ext-invalid",
        }),
        expect.objectContaining({
          path: "questions.0.options",
          recordIdentifier: "ext-invalid",
        }),
      ]),
    );

    const [rows] = await pool.query<ImportSessionRow[]>(
      `SELECT status, insert_count, update_count, sensitive_update_count
       FROM import_sessions
       ORDER BY id ASC`,
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]?.status).toBe("preview_invalid");
    expect(rows[0]?.insert_count).toBe(0);
    expect(rows[0]?.update_count).toBe(0);
    expect(rows[0]?.sensitive_update_count).toBe(0);
  });
});
