import { describe, expect, it } from "vitest";

import { getTestPool } from "../../lib/testing/test-database";
import { testLogger } from "../../lib/testing/test-logger";
import { createQuestion, duplicateQuestion, publishQuestion, updateQuestion } from "../../modules/questions/services/question-authoring";
import { createSubject } from "../../modules/subjects/services/subject-authoring";
import { createTopic } from "../../modules/topics/services/topic-authoring";

async function seedTopic() {
  const pool = await getTestPool();

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

  return pool;
}

describe("question authoring", () => {
  it("creates manual questions with generated internal external_id", async () => {
    const pool = await seedTopic();

    const question = await createQuestion({
      pool,
      logger: testLogger,
      input: {
        topicSlug: "aljabar",
        type: "single_choice",
        difficulty: "medium",
        questionText: "Soal manual",
        explanationText: "",
        options: [
          { option_key: "A", option_text: "A", is_correct: true },
          { option_key: "B", option_text: "B", is_correct: false },
        ],
      },
    });

    expect(question?.externalId.startsWith("manual_")).toBe(true);
    expect(question?.status).toBe("draft");
    expect(question?.source).toBe("manual:web");
  });

  it("rejects publish when explanation is missing and allows publish after update", async () => {
    const pool = await seedTopic();

    const question = await createQuestion({
      pool,
      logger: testLogger,
      input: {
        topicSlug: "aljabar",
        type: "single_choice",
        difficulty: "medium",
        questionText: "Soal manual",
        explanationText: "",
        options: [
          { option_key: "A", option_text: "A", is_correct: true },
          { option_key: "B", option_text: "B", is_correct: false },
        ],
      },
    });

    await expect(
      publishQuestion({
        pool,
        logger: testLogger,
        externalId: question!.externalId,
      }),
    ).rejects.toThrow("Published question must include explanation text.");

    await updateQuestion({
      pool,
      logger: testLogger,
      externalId: question!.externalId,
      input: {
        topicSlug: "aljabar",
        type: "single_choice",
        difficulty: "medium",
        status: "draft",
        questionText: "Soal manual",
        explanationText: "Pembahasan ada",
        options: [
          { option_key: "A", option_text: "A", is_correct: true },
          { option_key: "B", option_text: "B", is_correct: false },
        ],
      },
    });

    const published = await publishQuestion({
      pool,
      logger: testLogger,
      externalId: question!.externalId,
    });

    expect(published?.status).toBe("published");
  });

  it("duplicates an existing question into a new draft with a new external_id", async () => {
    const pool = await seedTopic();

    const question = await createQuestion({
      pool,
      logger: testLogger,
      input: {
        topicSlug: "aljabar",
        type: "multiple_response",
        difficulty: "hard",
        questionText: "Soal sumber",
        explanationText: "Pembahasan",
        options: [
          { option_key: "A", option_text: "A", is_correct: true },
          { option_key: "B", option_text: "B", is_correct: true },
          { option_key: "C", option_text: "C", is_correct: false },
        ],
      },
    });

    const duplicate = await duplicateQuestion({
      pool,
      logger: testLogger,
      externalId: question!.externalId,
    });

    expect(duplicate?.externalId).not.toBe(question?.externalId);
    expect(duplicate?.status).toBe("draft");
    expect(duplicate?.questionText).toBe("Soal sumber");
  });
});
