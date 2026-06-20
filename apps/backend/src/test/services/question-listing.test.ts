import { describe, expect, it } from "vitest";

import { getTestPool } from "../../lib/testing/test-database";
import { testLogger } from "../../lib/testing/test-logger";
import { bulkQuestionAction, createQuestion, listQuestions } from "../../modules/questions/services/question-authoring";
import { createSubject } from "../../modules/subjects/services/subject-authoring";
import { createTopic } from "../../modules/topics/services/topic-authoring";

async function seedQuestionBank() {
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

  const draftQuestion = await createQuestion({
    pool,
    logger: testLogger,
    input: {
      topicSlug: "aljabar",
      type: "single_choice",
      difficulty: "easy",
      questionText: "Draft soal",
      explanationText: "",
      options: [
        { option_key: "A", option_text: "A", is_correct: true },
        { option_key: "B", option_text: "B", is_correct: false },
      ],
    },
  });

  const publishableQuestion = await createQuestion({
    pool,
    logger: testLogger,
    input: {
      topicSlug: "aljabar",
      type: "single_choice",
      difficulty: "hard",
      questionText: "Published soal",
      explanationText: "Pembahasan siap",
      options: [
        { option_key: "A", option_text: "A", is_correct: true },
        { option_key: "B", option_text: "B", is_correct: false },
      ],
    },
  });

  return { pool, draftQuestion, publishableQuestion };
}

describe("question listing and bulk actions", () => {
  it("lists questions with server-side pagination and filters", async () => {
    const { pool, draftQuestion, publishableQuestion } = await seedQuestionBank();

    await bulkQuestionAction({
      pool,
      logger: testLogger,
      action: "publish",
      externalIds: [publishableQuestion!.externalId],
    });

    const publishedList = await listQuestions(pool, {
      page: 1,
      pageSize: 10,
      status: "published",
      archived: false,
      search: "Published",
    });

    expect(publishedList.total).toBe(1);
    expect(publishedList.items[0]?.externalId).toBe(publishableQuestion?.externalId);

    const draftList = await listQuestions(pool, {
      page: 1,
      pageSize: 10,
      status: "draft",
      archived: false,
      search: draftQuestion!.externalId.slice(0, 10),
    });

    expect(draftList.total).toBe(1);
    expect(draftList.items[0]?.externalId).toBe(draftQuestion?.externalId);
  });

  it("handles bulk publish with partial success and item-level failures", async () => {
    const { pool, draftQuestion, publishableQuestion } = await seedQuestionBank();

    const result = await bulkQuestionAction({
      pool,
      logger: testLogger,
      action: "publish",
      externalIds: [draftQuestion!.externalId, publishableQuestion!.externalId],
    });

    expect(result.successes).toEqual([publishableQuestion!.externalId]);
    expect(result.failures).toEqual([
      {
        externalId: draftQuestion!.externalId,
        message: "Published question must include explanation text.",
      },
    ]);
  });
});
